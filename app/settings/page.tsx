'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile, useSettings, useSync } from '@/lib/store';
import { ExperienceLevel, Goal } from '@/lib/types';
import { ChevronLeft, Save, Cloud, CloudOff, Key, Dumbbell, User, RefreshCw } from 'lucide-react';

const MAIN_LIFTS = [
  { id: 'squat',    label: 'Back Squat' },
  { id: 'bench',    label: 'Bench Press' },
  { id: 'deadlift', label: 'Deadlift' },
  { id: 'ohp',      label: 'Overhead Press' },
  { id: 'rdl',      label: 'Romanian Deadlift' },
  { id: 'row',      label: 'Barbell Row' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { profile, updateProfile } = useProfile();
  const { settings, updateSettings } = useSettings();
  const { syncing, syncError } = useSync();

  const [saved, setSaved] = useState(false);

  // Profile fields
  const [name, setName] = useState(profile?.name ?? '');
  const [age, setAge] = useState(String(profile?.age ?? ''));
  const [weight, setWeight] = useState(String(profile?.weight ?? ''));
  const [height, setHeight] = useState(String(profile?.height ?? ''));
  const [experience, setExperience] = useState<ExperienceLevel>(profile?.experience ?? 'intermediate');
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'powerbuilding');
  const [daysPerWeek, setDaysPerWeek] = useState<3|4>(profile?.daysPerWeek ?? 4);
  const [claudeApiKey, setClaudeApiKey] = useState(profile?.claudeApiKey ?? '');

  // Max lifts
  const [maxLifts, setMaxLifts] = useState<Record<string, string>>(
    Object.fromEntries(
      MAIN_LIFTS.map(l => [l.id, String(profile?.maxLifts[l.id] ?? '')])
    )
  );

  function setLift(id: string, val: string) {
    setMaxLifts(m => ({ ...m, [id]: val }));
  }

  function handleSave() {
    const liftNums: Record<string, number> = { ...(profile?.maxLifts ?? {}) };
    for (const { id } of MAIN_LIFTS) {
      const n = parseFloat(maxLifts[id]);
      if (n > 0) liftNums[id] = n;
      else if (maxLifts[id] === '') delete liftNums[id];
    }

    updateProfile({
      name: name.trim() || (profile?.name ?? 'Athlete'),
      age: parseInt(age) || profile?.age,
      weight: parseFloat(weight) || profile?.weight,
      height: parseInt(height) || profile?.height,
      experience,
      goal,
      daysPerWeek,
      maxLifts: liftNums,
      claudeApiKey: claudeApiKey.trim() || undefined,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!profile) return null;

  return (
    <div className="px-4 pt-6 pb-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-zinc-500 hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-black flex-1">Settings</h1>
        {/* Sync status */}
        <div className="flex items-center gap-1.5">
          {syncing ? (
            <RefreshCw size={14} className="text-zinc-500 animate-spin" />
          ) : syncError ? (
            <CloudOff size={14} className="text-orange-400" />
          ) : (
            <Cloud size={14} className="text-green-400" />
          )}
          <span className="text-[10px] text-zinc-600">
            {syncing ? 'Syncing…' : syncError ? 'Local only' : 'Synced'}
          </span>
        </div>
      </div>

      {/* Profile */}
      <Section icon={<User size={15} className="text-orange-400" />} title="Profile">
        <div className="space-y-3">
          <Field label="Name">
            <input className={cls} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Age">
              <input className={cls + ' no-spin'} type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="25" />
            </Field>
            <Field label="Weight (lbs)">
              <input className={cls + ' no-spin'} type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="180" />
            </Field>
            <Field label="Height (in)">
              <input className={cls + ' no-spin'} type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="70" />
            </Field>
          </div>

          <Field label="Experience">
            <div className="grid grid-cols-3 gap-2">
              {(['beginner','intermediate','advanced'] as ExperienceLevel[]).map(e => (
                <button key={e} onClick={() => setExperience(e)}
                  className={`py-2 rounded-xl text-xs font-bold capitalize border transition-colors ${experience === e ? 'bg-orange-500 border-orange-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                  {e}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Goal">
            <div className="grid grid-cols-3 gap-2">
              {([['strength','Strength'],['powerbuilding','Powerbuilding'],['hypertrophy','Hypertrophy']] as [Goal,string][]).map(([g, label]) => (
                <button key={g} onClick={() => setGoal(g)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors ${goal === g ? 'bg-orange-500 border-orange-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Days / Week">
            <div className="grid grid-cols-2 gap-2">
              {([3,4] as (3|4)[]).map(d => (
                <button key={d} onClick={() => setDaysPerWeek(d)}
                  className={`py-2.5 rounded-xl font-black border transition-colors ${daysPerWeek === d ? 'bg-orange-500 border-orange-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                  {d} Days
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Section>

      {/* Max Lifts */}
      <Section icon={<Dumbbell size={15} className="text-orange-400" />} title="1-Rep Max Estimates">
        <p className="text-xs text-zinc-500 -mt-1">Used to calculate target weights. Update after any significant PR.</p>
        <div className="space-y-2 mt-1">
          {MAIN_LIFTS.map(lift => (
            <div key={lift.id} className="flex items-center gap-3">
              <span className="text-sm text-zinc-400 flex-1">{lift.label}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={maxLifts[lift.id]}
                  onChange={e => setLift(lift.id, e.target.value)}
                  placeholder="—"
                  className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm font-bold text-right focus:outline-none focus:border-orange-500 no-spin"
                />
                <span className="text-xs text-zinc-600">lbs</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* AI Coaching */}
      <Section icon={<Key size={15} className="text-orange-400" />} title="AI Coaching">
        <Field label="Claude API Key">
          <input
            type="password"
            value={claudeApiKey}
            onChange={e => setClaudeApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className={cls}
          />
        </Field>
        <p className="text-xs text-zinc-600 mt-1">
          Used for readiness feedback, post-workout analysis, weekly coaching, and AI-driven program adjustments. Stored locally and synced encrypted. Get yours at console.anthropic.com.
        </p>
      </Section>

      {/* Preferences */}
      <Section icon={<RefreshCw size={15} className="text-orange-400" />} title="Preferences">
        <Field label="Weight Unit">
          <div className="grid grid-cols-2 gap-2">
            {(['lbs','kg'] as const).map(u => (
              <button key={u} onClick={() => updateSettings({ weightUnit: u })}
                className={`py-2.5 rounded-xl font-bold border transition-colors ${settings.weightUnit === u ? 'bg-orange-500 border-orange-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                {u}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* Cross-device sync info */}
      <div className={`rounded-xl px-4 py-3 border text-xs ${syncError ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
        {syncError ? (
          <>
            <p className="font-bold mb-1">Cross-device sync not configured</p>
            <p>To sync between desktop and mobile, add a Vercel KV database to your iron-log project: Vercel dashboard → Storage → Create KV → Connect to project. Env vars are set automatically.</p>
          </>
        ) : (
          <p>Your data syncs automatically across all devices. Last save is always the source of truth.</p>
        )}
      </div>

      <button
        onClick={handleSave}
        className={`w-full font-bold py-4 rounded-2xl transition-all text-lg flex items-center justify-center gap-2 ${saved ? 'bg-green-500 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}>
        <Save size={18} />
        {saved ? 'Saved!' : 'Save Changes'}
      </button>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-bold">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const cls = 'w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-orange-500 transition-colors placeholder:text-zinc-600';
