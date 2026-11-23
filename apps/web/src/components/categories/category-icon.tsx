import {
  BookIcon,
  BookOpenIcon,
  ClockIcon,
  HeartIcon,
  LibraryIcon,
  SettingsIcon,
  ShieldIcon,
  SparkleIcon,
  UserIcon,
} from '@/components/icons';

const iconMap: Record<string, typeof BookIcon> = {
  'graduation-cap': LibraryIcon,
  'trending-up': SparkleIcon,
  users: UserIcon,
  'heart-pulse': HeartIcon,
  sparkles: SparkleIcon,
  cpu: SettingsIcon,
  globe: BookIcon,
  'book-marked': BookOpenIcon,
  'book-open': BookOpenIcon,
  book: BookIcon,
  heart: HeartIcon,
  child: UserIcon,
  user: UserIcon,
  search: BookIcon,
  flame: SparkleIcon,
  clock: ClockIcon,
  shield: ShieldIcon,
};

export function CategoryIcon({
  icon,
  className,
}: {
  icon?: string | null;
  className?: string;
}) {
  const Icon = iconMap[icon ?? ''] ?? BookIcon;
  return <Icon className={className} />;
}
