'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/field';
import { useToast } from '@/components/toast';
import { login, register, setAccessToken } from '@/lib/api';

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'verify';

const copy: Record<Mode, { title: string; description: string; submit: string }> = {
  login: {
    title: 'Đăng nhập',
    description: 'Chào mừng bạn trở lại thư viện.',
    submit: 'Đăng nhập',
  },
  register: {
    title: 'Tạo tài khoản',
    description: 'Bắt đầu hành trình đọc của bạn.',
    submit: 'Tạo tài khoản',
  },
  forgot: {
    title: 'Quên mật khẩu',
    description: 'Nhập email để nhận liên kết khôi phục.',
    submit: 'Gửi liên kết',
  },
  reset: {
    title: 'Đặt lại mật khẩu',
    description: 'Chọn mật khẩu mới cho tài khoản.',
    submit: 'Đặt lại mật khẩu',
  },
  verify: {
    title: 'Xác minh email',
    description: 'Kiểm tra hộp thư để xác nhận địa chỉ email.',
    submit: 'Gửi lại email',
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const { toast } = useToast();
  const router = useRouter();
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' });
  const [recoveryKey, setRecoveryKey] = useState('');
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof values) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const result = await login(values.email, values.password);
        setAccessToken(result.accessToken);
        toast('Đăng nhập thành công.', 'default');
        router.push('/library');
        router.refresh();
        return;
      }
      if (mode === 'register') {
        if (values.password !== values.confirm) {
          toast('Mật khẩu xác nhận không khớp.', 'default');
          return;
        }
        const result = await register(values.name, values.email, values.password);
        setRecoveryKey(result.recoveryKey);
        toast('Tài khoản đã được tạo.', 'default');
        return;
      }
      toast('Tính năng này chưa được kết nối.', 'default');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Đã có lỗi xảy ra.', 'default');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-site flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <Card className="w-full max-w-md p-7 sm:p-8">
        <div className="mb-7 flex justify-center">
          <Logo />
        </div>
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl text-foreground">{copy[mode].title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{copy[mode].description}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'register' ? (
            <div>
              <Label htmlFor="auth-name">Tên hiển thị</Label>
              <Input id="auth-name" value={values.name} onChange={set('name')} autoComplete="name" required />
            </div>
          ) : null}

          {mode !== 'reset' && mode !== 'verify' ? (
            <div>
              <Label htmlFor="auth-email">Email</Label>
              <Input id="auth-email" type="email" value={values.email} onChange={set('email')} autoComplete="email" required />
            </div>
          ) : null}

          {mode === 'login' || mode === 'register' ? (
            <div>
              <Label htmlFor="auth-password">Mật khẩu</Label>
              <Input id="auth-password" type="password" value={values.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
            </div>
          ) : null}

          {mode === 'register' || mode === 'reset' ? (
            <div>
              <Label htmlFor="auth-confirm">Xác nhận mật khẩu</Label>
              <Input id="auth-confirm" type="password" value={values.confirm} onChange={set('confirm')} autoComplete="new-password" required />
            </div>
          ) : null}

          {mode === 'reset' ? (
            <div>
              <Label htmlFor="auth-password">Mật khẩu mới</Label>
              <Input id="auth-password" type="password" value={values.password} onChange={set('password')} autoComplete="new-password" required />
            </div>
          ) : null}

          {mode === 'verify' ? (
            <p className="rounded-xl bg-surface p-4 text-center text-sm text-muted-foreground">
              Chúng tôi đã gửi một liên kết xác minh đến email của bạn. Vui lòng kiểm tra hộp thư.
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Đang xử lý…' : copy[mode].submit}
          </Button>
        </form>

        {recoveryKey ? (
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Lưu lại Khóa khôi phục ngay bây giờ:</p>
            <p className="mt-1 break-all font-mono text-xs">{recoveryKey}</p>
            <p className="mt-1 text-xs">Khóa này chỉ hiển thị một lần. Nếu mất, bạn sẽ không thể khôi phục tài khoản.</p>
          </div>
        ) : null}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === 'login' ? (
            <p>
              Chưa có tài khoản?{' '}
              <Link href="/auth/register" className="font-medium text-primary hover:underline">
                Đăng ký
              </Link>
              {' · '}
              <Link href="/auth/forgot-password" className="font-medium text-primary hover:underline">
                Quên mật khẩu?
              </Link>
            </p>
          ) : null}
          {mode === 'register' ? (
            <p>
              Đã có tài khoản?{' '}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                Đăng nhập
              </Link>
            </p>
          ) : null}
          {mode === 'forgot' || mode === 'reset' || mode === 'verify' ? (
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              ← Quay lại đăng nhập
            </Link>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
