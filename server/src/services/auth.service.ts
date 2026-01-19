
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { type IUser } from '../models/User.ts';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export class AuthService {

  static async register(data: { name: string; email: string; password?: string; googleId?: string; avatar?: string }): Promise<{ user: IUser; token: string }> {
    let user = await User.findOne({ email: data.email });
    if (user) {
      throw new Error('User already exists');
    }

    let hashedPassword = undefined;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 12);
    }

    user = new User({
      ...data,
      password: hashedPassword,
      jwtSecureCode: uuidv4(),
    });
    await user.save();

    const token = this.generateToken(user);
    return { user, token };
  }

  static async login(email: string, password?: string): Promise<{ user: IUser; token: string }> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user has password (local auth)
    const userData = user.toObject() as any;
    if (!userData.password) {
      throw new Error('Use Google login');
    }

    if (!password) {
      throw new Error('Password required');
    }

    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Rotate security code to invalidate other sessions
    user.jwtSecureCode = uuidv4();
    await user.save();

    const token = this.generateToken(user);
    return { user, token };
  }

  static async forgotPassword(email: string): Promise<string> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }

    // Generate random token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.set('resetPasswordToken', hashedToken);
    user.set('resetPasswordExpires', new Date(Date.now() + 10 * 60 * 1000)); // 10 minutes
    await user.save();

    // Send email via Nodemailer
    try {
      const nodemailer = await import('nodemailer');

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"ExamPrep Support" <noreply@examprep.com>',
        to: email,
        subject: 'Password Reset Request',
        html: `
          <p>You requested a password reset</p>
          <p>Click this link to reset your password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>If you didn't request this, ignore this email.</p>
        `,
      });
      console.log(`[EMAIL SENT] Reset link for ${email}: ${resetUrl}`);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Fallback for dev if email fails
      console.log(`[DEV FALLBACK] Reset Token: ${resetToken}`);
    }

    return resetToken;
  }

  static async resetPassword(token: string, newPassword?: string): Promise<{ user: IUser; token: string }> {
    if (!newPassword) throw new Error('Password is required');

    const crypto = await import('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new Error('Invalid or expired token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.set('resetPasswordToken', undefined);
    user.set('resetPasswordExpires', undefined);
    // Rotate security code mostly just in case
    user.jwtSecureCode = uuidv4();

    await user.save();

    const jwtToken = this.generateToken(user);
    return { user, token: jwtToken };
  }

  static generateToken(user: IUser): string {
    return jwt.sign(
      { id: (user as any)._id, jwtSecureCode: (user as any).jwtSecureCode },
      JWT_SECRET,
      { expiresIn: '6h' }
    );
  }
}
