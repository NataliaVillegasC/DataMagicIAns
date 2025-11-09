import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InterviewRequest {
  candidateId: string;
  interviewDate: string;
  interviewTime: string;
  duration: number;
  location: string;
  notes?: string;
  interviewType: string;
}

// Generate iCalendar format for calendar invite
function generateICalendar(
  startDate: Date,
  endDate: Date,
  summary: string,
  description: string,
  location: string,
  attendees: string[]
): string {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Recruitment Platform//Interview Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    ...attendees.map(email => `ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${email}`),
    `UID:${Date.now()}@recruitment-platform`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Interview Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1] || '';
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4 || 4)) % 4, '=');
    return JSON.parse(atob(padded));
  } catch (e) {
    console.error('Failed to parse JWT:', e);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      throw new Error('No authorization header');
    }

    const jwt = authHeader.replace('Bearer ', '');
    const payload = parseJwt(jwt);
    const userId = payload?.sub;

    if (!userId) {
      console.error('No user ID in token');
      throw new Error('Invalid token');
    }

    console.log('Processing interview request for user:', userId);

    // Use service role key for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      candidateId,
      interviewDate,
      interviewTime,
      duration,
      location,
      notes,
      interviewType
    }: InterviewRequest = await req.json();

    console.log('Scheduling interview for candidate:', candidateId);

    // Parse date and time
    const startDateTime = new Date(`${interviewDate}T${interviewTime}`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    // Insert interview record into database
    const { data: interviewRecord, error: insertError } = await supabaseAdmin
      .from('interviews')
      .insert({
        candidate_id: candidateId,
        scheduled_by: userId,
        interview_type: interviewType,
        scheduled_date: startDateTime.toISOString(),
        duration_minutes: duration,
        location: location || null,
        notes: notes || null,
        status: 'scheduled'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting interview:', insertError);
      throw insertError;
    }

    // Get candidate details
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('candidates')
      .select('email, full_name')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      console.error('Candidate error:', candidateError);
      throw new Error('Candidate not found');
    }

    // Get recruiter details
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, company')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      throw new Error('Profile not found');
    }

    // Generate calendar invite
    const calendarInvite = generateICalendar(
      startDateTime,
      endDateTime,
      `${interviewType} - ${candidate.full_name}`,
      `Interview with ${candidate.full_name}\n\nType: ${interviewType}\nLocation: ${location}\n\n${notes || 'No additional notes'}`,
      location,
      [candidate.email, profile.email]
    );

    // Format dates for email
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const formattedDate = dateFormatter.format(startDateTime);
    const formattedTime = timeFormatter.format(startDateTime);

    // Send email to candidate
    await resend.emails.send({
      from: `${profile.company || 'Recruitment'} <noreply@skill-sense.me>`,
      to: [candidate.email],
      subject: `Interview Invitation - ${interviewType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Interview Invitation</h2>
          <p>Dear ${candidate.full_name},</p>
          <p>You have been invited to an interview with ${profile.company || 'our company'}.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #555;">Interview Details</h3>
            <p><strong>Type:</strong> ${interviewType}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
            <p><strong>Duration:</strong> ${duration} minutes</p>
            <p><strong>Location:</strong> ${location}</p>
            ${notes ? `<p><strong>Additional Notes:</strong><br/>${notes}</p>` : ''}
          </div>

          <p>A calendar invite has been attached to this email. Please add it to your calendar.</p>
          <p>If you have any questions or need to reschedule, please reply to this email.</p>
          
          <p>Best regards,<br/>${profile.full_name}<br/>${profile.company || 'Recruitment Team'}</p>
        </div>
      `,
      attachments: [
        {
          filename: 'interview.ics',
          content: btoa(calendarInvite),
        },
      ],
    });

    // Send copy to recruiter
    await resend.emails.send({
      from: `${profile.company || 'Recruitment'} <noreply@skill-sense.me>`,
      to: [profile.email],
      subject: `Interview Scheduled - ${candidate.full_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Interview Confirmation</h2>
          <p>You have successfully scheduled an interview with ${candidate.full_name}.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #555;">Interview Details</h3>
            <p><strong>Candidate:</strong> ${candidate.full_name}</p>
            <p><strong>Email:</strong> ${candidate.email}</p>
            <p><strong>Type:</strong> ${interviewType}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
            <p><strong>Duration:</strong> ${duration} minutes</p>
            <p><strong>Location:</strong> ${location}</p>
            ${notes ? `<p><strong>Notes:</strong><br/>${notes}</p>` : ''}
          </div>

          <p>A calendar invite has been sent to both you and the candidate.</p>
        </div>
      `,
      attachments: [
        {
          filename: 'interview.ics',
          content: btoa(calendarInvite),
        },
      ],
    });

    console.log("Interview scheduled successfully");

    return new Response(
      JSON.stringify({ success: true, message: 'Interview scheduled and invites sent' }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in schedule-interview function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
