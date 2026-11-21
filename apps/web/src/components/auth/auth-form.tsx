'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/field';
import { useToast } from '@/components/toast';
import {
  confirmEmailVerification,
  getAccessToken,
  login,
  register,
  requestEmailVerification,
  requestPasswordReset,
  resetPassword,
  resetPasswordWithRecoveryKey,
  setAccessToken,
} from '@/lib/api';

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
    description: 'Gửi yêu cầu khôi phục bằng email nếu dịch vụ email khả dụng.',
    submit: 'Gửi yêu cầu',
  },
  reset: {
    title: 'Đặt lại mật khẩu',
    description: 'Đặt lại bằng liên kết email hoặc Recovery Key.',
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
  const [token, setToken] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'info' | 'error'>('info');
  const [loading, setLoading] = useState(false);
  const verifyStarted = useRef(false);

  /**
   * Token nằm trong query của link gửi qua email. Đọc trực tiếp trên client
   * (không dùng useSearchParams) để trang vẫn prerender được trên Cloudflare.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') ?? '');
  }, []);

  /** Mở link ?token=... → xác minh ngay, chỉ chạy một lần cho mỗi token. */
  useEffect(() => {
    if (mode !== 'verify' || !token || verifyStarted.current) return;
    verifyStarted.current = true;
    let active = true;
    setLoading(true);
    confirmEmailVerification(token)
      .then(() => {
        if (active) {
          setNoticeTone('info');
          setNotice('Email đã được xác minh thành công. Bạn có thể đăng nhập.');
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setNoticeTone('error');
          setNotice(
            error instanceof Error
              ? error.message
              : 'Liên kết xác minh không hợp lệ hoặc đã hết hạn.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, token]);

  function set(key: keyof typeof values) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const result = await login(values.email.trim(), values.password);
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
        const result = await register(values.name, values.email.trim(), values.password);
        setRecoveryKey(result.recoveryKey);
        toast('Tài khoản đã được tạo.', 'default');
        return;
      }
      if (mode === 'forgot') {
        await requestPasswordReset(values.email.trim());
        setNoticeTone('info');
        setNotice(
          'Yêu cầu đã được ghi nhận. Hệ thống chỉ gửi liên kết khi tài khoản tồn tại và dịch vụ email khả dụng.',
        );
        return;
      }
      if (mode === 'reset') {
        if (values.password !== values.confirm) {
          setNoticeTone('error');
          setNotice('Mật khẩu xác nhận không khớp.');
          return;
        }
        if (token) {
          await resetPassword(token, values.password);
        } else {
          if (!values.email.trim() || !recoveryKey.trim()) {
            setNoticeTone('error');
            setNotice('Nhập email/tên đăng nhập và Recovery Key để tiếp tục.');
            return;
          }
          await resetPasswordWithRecoveryKey(values.email.trim(), recoveryKey.trim(), values.password);
        }
        setNoticeTone('info');
        setNotice('Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.');
        toast('Đặt lại mật khẩu thành công.', 'default');
        return;
      }
      if (mode === 'verify') {
        if (token) return;
        if (!getAccessToken()) {
          setNoticeTone('error');
          setNotice('Vui lòng đăng nhập để gửi lại email xác minh.');
          return;
        }
        const result = await requestEmailVerification();
        setNoticeTone(result.delivery === 'sent' ? 'info' : 'error');
        setNotice(
          result.delivery === 'sent'
            ? 'Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư.'
            : result.delivery === 'already_verified'
              ? 'Email của bạn đã được xác minh trước đó.'
              : 'Hệ thống email chưa được cấu hình nên chưa thể gửi. Vui lòng thử lại sau.',
        );
        return;
      }
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
              <Label htmlFor="auth-email">{mode === 'login' ? 'Email hoặc tên đăng nhập' : 'Email'}</Label>
              <Input
                id="auth-email"
                type={mode === 'login' ? 'text' : 'email'}
                value={values.email}
                onChange={set('email')}
                autoComplete={mode === 'login' ? 'username' : 'email'}
                required
              />
            </div>
          ) : null}

          {mode === 'reset' && !token ? (
            <>
              <div>
                <Label htmlFor="auth-reset-identifier">Email hoặc tên đăng nhập</Label>
                <Input
                  id="auth-reset-identifier"
                  value={values.email}
                  onChange={set('email')}
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <Label htmlFor="auth-recovery-key">Recovery Key</Label>
                <Input
                  id="auth-recovery-key"
                  type="password"
                  value={recoveryKey}
                  onChange={(event) => setRecoveryKey(event.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
            </>
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

          {mode === 'verify' && !token ? (
            <p className="rounded-xl bg-surface p-4 text-center text-sm text-muted-foreground">
              Liên kết xác minh đã được gửi tới email của bạn. Nếu chưa nhận được, hãy đăng nhập và gửi lại.
            </p>
          ) : null}

          {mode !== 'verify' || !token ? (
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Đang xử lý…' : copy[mode].submit}
            </Button>
          ) : null}
        </form>

        {notice ? (
          <p
            role="status"
            className={
              noticeTone === 'error'
                ? 'mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800'
                : 'mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900'
            }
          >
            {notice}
          </p>
        ) : null}

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
