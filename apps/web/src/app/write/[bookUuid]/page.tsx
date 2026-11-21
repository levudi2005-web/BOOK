import { StudioEditor } from '@/components/studio/studio-editor';

export const metadata = {
  title: 'Author Studio',
};

type Props = {
  params: Promise<{ bookUuid: string }>;
};

export default async function StudioBookPage({ params }: Props) {
  const { bookUuid } = await params;
  return <StudioEditor bookUuid={bookUuid} />;
}
