import { AuthForm } from '@/components/auth/auth-form';

export const metadata = { title: 'Xác minh email' };

export default function VerifyEmailPage() {
  return <AuthForm mode="verify" />;
}
