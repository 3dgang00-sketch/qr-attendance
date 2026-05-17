# Automatic Credentials Email System

## Overview

The attendance management system now includes an automatic email system that sends login credentials (username and temporary password) to users when their registration is approved by an administrator.

## How It Works

### 1. Registration Flow
- User registers with email and password
- Verification email is sent to the user's email
- User verifies their email
- Administrator approves the registration request

### 2. Approval Process (Automatic)
When an admin approves a registration:
1. A **temporary password** is automatically generated
2. A **username** is derived from the user's email
3. The user's password in the database is updated to the temporary one
4. A **credentials email** is automatically sent containing:
   - Username (derived from email)
   - Temporary password
   - Link to login page
   - Security instructions

### 3. User First Login
- User receives the credentials email
- User logs in with username and temporary password
- User is prompted to change their password to something secure

## Features

✅ **Automatic credential generation** - No manual entry required
✅ **Secure temporary passwords** - Mixed case, numbers, and symbols
✅ **Professional email templates** - Clear and user-friendly
✅ **Security reminders** - Encourages users to change password
✅ **Manual credential sending** - For admins who need to resend credentials

## Environment Configuration

To use the automatic email system, configure these environment variables in your `.env` file:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
FRONTEND_URL=http://localhost:3000
```

### Gmail Setup

1. Enable 2-Factor Authentication in Google Account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the 16-character app password in `EMAIL_PASSWORD`

## Manual Scripts

### 1. Verify Pending Emails
Manually mark pending registrations as email-verified (for development):

```bash
cd backend
node verify-pending-emails.js
```

### 2. Send Credentials to User
Manually send credentials to a specific user:

```bash
cd backend
node send-credentials.js <user_id> <email>
```

**Example:**
```bash
node send-credentials.js LECTURER_1234567890 user@university.edu
```

## Generated Credentials

### Username
- **Source:** Email address
- **Format:** `firstname_lastname` or `firstname.lastname` converted to `firstname_lastname`
- **Example:** 
  - Email: `john.doe@university.edu` → Username: `john_doe`
  - Email: `jane@university.edu` → Username: `jane`

### Temporary Password
- **Length:** 12 characters
- **Format:** Mix of uppercase, lowercase, numbers, and symbols
- **Example:** `K7#mLp2Qx@R9`
- **Expiry:** No expiry (but users should change it on first login)

## Email Templates

### Credentials Email
Sent when registration is approved. Contains:
- Congratulations message
- Username and temporary password
- Login link
- Password change reminder
- Security warnings

### Verification Email (Existing)
Sent during registration. Contains:
- Verification link
- 24-hour expiry notice

### Rejection Email (Existing)
Sent if registration is rejected. Contains:
- Rejection reason
- Contact information

## Database Changes

No additional columns are required. The system uses existing columns:
- `password_hash` - Updated with temporary password hash
- `user_id` - Unique identifier for the user
- `email` - Used for sending credentials

## Testing

### Test Flow

1. **Register new user:**
   ```
   POST /api/auth/register
   {
     "email": "test@example.com",
     "password": "TestPassword123",
     "fullName": "Test User",
     "proposedRole": "STUDENT"
   }
   ```

2. **Verify email (dev only):**
   ```bash
   node verify-pending-emails.js
   ```

3. **Approve registration via admin dashboard:**
   - Go to Admin Dashboard > Requests tab
   - Click Approve on EMAIL_VERIFIED request

4. **Check email:**
   - Credentials email with username and temp password should arrive

5. **Login with credentials:**
   - Use the provided username and temporary password
   - User will be redirected to change password

## Troubleshooting

### Email Not Sending
- Check `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`
- Check email configuration (SMTP host/port)
- Look for warnings in server console logs

### Wrong Credentials Generated
- Check that `generateUsername()` is working correctly
- Verify temporary password generation in `credentialsGenerator.js`

### User Can't Login with Provided Credentials
- Verify username format matches what was sent
- Check that temporary password hash was updated in database
- Ensure user role is active (`is_active = 1`)

## Security Considerations

⚠️ **Important:**
- Temporary passwords should only be used for first login
- Users MUST change passwords after first login
- Never store plain-text passwords in email
- Use HTTPS in production
- Consider rate-limiting password change endpoint

## Future Enhancements

Possible improvements:
- [ ] Password reset via email
- [ ] OTP-based verification
- [ ] Two-factor authentication
- [ ] Custom email templates per institution
- [ ] Bulk credential generation
- [ ] Scheduled reminder emails
