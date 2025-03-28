import sgMail from '@sendgrid/mail';

// Set the SendGrid API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.error('SENDGRID_API_KEY environment variable not set!');
}

interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Send an email using SendGrid
 * Uses the authenticated em3442.gocareerate.com domain
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // Try to send the email using SendGrid
    await sgMail.send(options);
    console.log('Email sent successfully to', options.to);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Log details about the attempted email
    console.log('Failed to send email with these options:', {
      to: options.to,
      from: options.from,
      subject: options.subject
    });
    
    // In development, simulate success despite errors for testing UI flows
    if (process.env.NODE_ENV !== 'production') {
      console.log('DEV MODE: Simulating successful email delivery despite SendGrid API error');
      console.log(JSON.stringify(options, null, 2));
      return true;
    }
    
    return false;
  }
};

/**
 * Send a contact form email
 */
export const sendContactEmail = async (
  name: string,
  email: string,
  message: string
): Promise<boolean> => {
  const emailOptions: EmailOptions = {
    to: 'support@gocareerate.com', // Support email using authenticated domain
    from: 'noreply@em3442.gocareerate.com', // Verified sender email from SendGrid
    subject: `Careerate Contact Form: Message from ${name}`,
    text: `
      Name: ${name}
      Email: ${email}
      
      Message:
      ${message}
    `,
    html: `
      <h3>New Contact Form Submission</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `
  };

  return sendEmail(emailOptions);
};

/**
 * Send a partnership request email
 */
export const sendPartnershipEmail = async (
  companyName: string,
  contactName: string,
  contactEmail: string,
  companySize: string,
  partnershipType: string,
  message: string
): Promise<boolean> => {
  const emailOptions: EmailOptions = {
    to: 'partnerships@gocareerate.com', // Partnerships email using authenticated domain
    from: 'noreply@em3442.gocareerate.com', // Verified sender email from SendGrid
    subject: `Careerate Partnership Request: ${companyName}`,
    text: `
      Company Name: ${companyName}
      Contact Name: ${contactName}
      Contact Email: ${contactEmail}
      Company Size: ${companySize}
      Partnership Type: ${partnershipType}
      
      Message:
      ${message}
    `,
    html: `
      <h3>New Partnership Request</h3>
      <p><strong>Company Name:</strong> ${companyName}</p>
      <p><strong>Contact Name:</strong> ${contactName}</p>
      <p><strong>Contact Email:</strong> ${contactEmail}</p>
      <p><strong>Company Size:</strong> ${companySize}</p>
      <p><strong>Partnership Type:</strong> ${partnershipType}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `
  };

  return sendEmail(emailOptions);
};