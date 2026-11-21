import { AuthForm } from '@/components/auth/auth-form';

export const metadata = { title: 'Đăng nhập' };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
