import { AuthForm } from '@/components/auth/auth-form';

export const metadata = { title: 'Đặt lại mật khẩu' };

export default function ResetPasswordPage() {
  return <AuthForm mode="reset" />;
}
