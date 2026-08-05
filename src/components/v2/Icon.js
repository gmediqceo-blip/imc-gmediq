// ═══════════════════════════════════════════════════════════════════════
// Icon.js — Helpers del rediseño V2 (adaptación quirúrgica del mockup)
// Contiene: Icon (wrapper Lucide), EstadoDot, Modulos, Inicial
// ═══════════════════════════════════════════════════════════════════════

import {
  Users, CalendarDays, Dumbbell, UserCog, LogOut, FlaskConical,
  Plus, Search, Filter, Bell, ChevronRight, KeyRound, RefreshCw, Play, Pause,
  Utensils, Activity, Zap, Mail, Lock, CheckCircle2, Send,
  ArrowLeft, ArrowUpRight, ArrowDownRight, LayoutDashboard, History,
  Ruler, TrendingUp, Stethoscope, Sparkles, Folder, FileText,
  IdCard, Fingerprint, Cake, Target, Menu, X, Edit, Eye, Trash,
  Printer, Phone, MessageCircle, ChevronLeft, ChevronDown, ChevronUp,
  Home, Settings, HelpCircle, Info, AlertCircle, AlertTriangle,
  Clock, MapPin, Building, User, UserPlus, Copy, Download, Upload,
  Save, MoreHorizontal, MoreVertical,
} from 'lucide-react';

// Mapa de nombres del mockup → componentes Lucide reales
const iconMap = {
  users: Users,
  'calendar-days': CalendarDays,
  dumbbell: Dumbbell,
  'user-cog': UserCog,
  'log-out': LogOut,
  'flask-conical': FlaskConical,
  plus: Plus,
  search: Search,
  filter: Filter,
  bell: Bell,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'key-round': KeyRound,
  'refresh-cw': RefreshCw,
  play: Play,
  pause: Pause,
  utensils: Utensils,
  activity: Activity,
  zap: Zap,
  mail: Mail,
  lock: Lock,
  'check-circle-2': CheckCircle2,
  send: Send,
  'arrow-left': ArrowLeft,
  'arrow-up-right': ArrowUpRight,
  'arrow-down-right': ArrowDownRight,
  'layout-dashboard': LayoutDashboard,
  history: History,
  ruler: Ruler,
  'trending-up': TrendingUp,
  stethoscope: Stethoscope,
  sparkles: Sparkles,
  folder: Folder,
  'file-text': FileText,
  'id-card': IdCard,
  fingerprint: Fingerprint,
  cake: Cake,
  target: Target,
  menu: Menu,
  x: X,
  edit: Edit,
  eye: Eye,
  trash: Trash,
  printer: Printer,
  phone: Phone,
  'message-circle': MessageCircle,
  home: Home,
  settings: Settings,
  'help-circle': HelpCircle,
  info: Info,
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  clock: Clock,
  'map-pin': MapPin,
  building: Building,
  user: User,
  'user-plus': UserPlus,
  copy: Copy,
  download: Download,
  upload: Upload,
  save: Save,
  'more-horizontal': MoreHorizontal,
  'more-vertical': MoreVertical,
};

// ── Icon: wrapper de Lucide con la API del mockup ─────────────────────
export function Icon({ name, size = 18, strokeWidth = 1.75, color = 'currentColor', style }) {
  const IconComp = iconMap[name];
  if (!IconComp) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        flexShrink: 0,
        width: size,
        height: size,
        ...style,
      }}
    >
      <IconComp size={size} strokeWidth={strokeWidth} />
    </span>
  );
}

// ── ESTADO: paleta oficial del rediseño V2 ────────────────────────────
export const ESTADO = {
  pendiente_activacion: { label: 'Pendiente activación', color: '#7C8DA1' },
  activo:               { label: 'Activo',               color: '#1A7A4A' },
  por_vencer:           { label: 'Por vencer',           color: '#B87503' },
  modo_lectura:         { label: 'Modo lectura',         color: '#C25A00' },
  suspendido:           { label: 'Suspendido',           color: '#B02020' },
  finalizado:           { label: 'Finalizado',           color: '#4B647A' },
};

export function EstadoDot({ estado }) {
  const e = ESTADO[estado] || ESTADO.pendiente_activacion;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 12.5,
        fontWeight: 500,
        color: e.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          background: e.color,
          boxShadow: '0 0 0 3px ' + e.color + '1F',
        }}
      />
      {e.label}
    </span>
  );
}

// ── MODULOS: iconos coloreados de nutri/fisio/aparato ─────────────────
export const MODULOS = [
  { key: 'nutricion', icon: 'utensils', label: 'Nutrición', color: '#1A7A4A' },
  { key: 'fisio', icon: 'activity', label: 'Fisioterapia', color: '#C25A00' },
  { key: 'aparato', icon: 'zap', label: 'Aparatología', color: '#7C3AED' },
];

export function Modulos({ p, size = 30 }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {MODULOS.map(m => {
        const on = !!p[m.key];
        return (
          <span
            key={m.key}
            title={m.label + (on ? '' : ' — no contratado')}
            style={{
              width: size,
              height: size,
              borderRadius: 9,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: on ? m.color + '14' : 'var(--line-soft)',
              color: on ? m.color : '#C3CEDC',
            }}
          >
            <Icon name={m.icon} size={15} strokeWidth={on ? 1.9 : 1.6} />
          </span>
        );
      })}
    </div>
  );
}

// ── Inicial: avatar con letra inicial ─────────────────────────────────
export function Inicial({ nombre, size = 40, tone = 'soft' }) {
  const bg = tone === 'soft'
    ? 'linear-gradient(150deg,#EAF3FA,#D8E7F4)'
    : 'linear-gradient(150deg,#1E7CB5,#0B1F3B)';
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2.6,
        background: bg,
        color: tone === 'soft' ? 'var(--accent-deep)' : '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: Math.round(size * 0.36),
        flexShrink: 0,
        border: tone === 'soft' ? '1px solid #DCEAF6' : 'none',
      }}
    >
      {String(nombre || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export default Icon;
