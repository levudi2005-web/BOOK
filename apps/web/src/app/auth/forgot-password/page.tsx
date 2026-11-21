import { AuthForm } from '@/components/auth/auth-form';

export const metadata = { title: 'Quên mật khẩu' };

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" />;
}
