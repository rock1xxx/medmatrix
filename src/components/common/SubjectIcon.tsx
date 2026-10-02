import React from 'react'
import {
  Bug,
  Bone,
  Activity,
  Scissors,
  HeartPulse,
  FlaskConical,
  Zap,
  Pill,
  Users,
  ShieldAlert,
  Baby,
  Stethoscope,
  Eye,
  Ear,
  FileBadge,
  Sparkles,
  Brain,
  Scan,
  Syringe,
  BookOpen,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Bug,
  Bone,
  Activity,
  Scissors,
  HeartPulse,
  FlaskConical,
  Zap,
  Pill,
  Users,
  ShieldAlert,
  Baby,
  Stethoscope,
  Eye,
  Ear,
  FileBadge,
  Sparkles,
  Brain,
  Scan,
  Syringe,
}

interface SubjectIconProps {
  name: string
  className?: string
  size?: number
}

export const SubjectIcon: React.FC<SubjectIconProps> = ({ name, className = 'w-4 h-4', size = 16 }) => {
  const IconComponent = ICON_MAP[name] || BookOpen
  return <IconComponent className={className} size={size} />
}
