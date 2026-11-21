'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/field';
import { useToast } from '@/components/toast';
import { adminLogin } from '@/lib/api';

export function AdminLogin() {
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await adminLogin(email, password);
      toast('Đăng nhập quản trị thành công.', 'default');
      router.push('/admin');
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Đăng nhập thất bại.', 'default');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md p-7 sm:p-8">
        <div className="mb-7 flex justify-center">
          <Logo />
        </div>
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl text-foreground">Quản trị hệ thống</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Khu vực dành riêng cho quản trị viên BOOKFORFREEDOM.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="admin-email">Email</Label>
            <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="admin-password">Mật khẩu</Label>
            <Input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Đang xác thực…' : 'Đăng nhập quản trị'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
