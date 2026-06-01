'use client';

import { MODEL_TIERS, type ModelTier } from '@edubrain/core';
import Link from 'next/link';
import { type KeyboardEvent, useRef, useState } from 'react';
import { transcribeAudio } from '@/lib/api';
import type { DocumentDTO, FrameworkDTO } from '@/lib/types';
import {
  ArrowUpIcon,
  ChevronDownIcon,
  FileIcon,
  GaugeIcon,
  MicIcon,
  PaperclipIcon,
  SparkIcon,
  SpinnerIcon,
  StopIcon,
  XIcon,
} from './icons';
import { type MenuOption, PopoverMenu } from './popover-menu';

type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

const MODEL_OPTIONS: Record<ModelTier, { short: string; label: string; description: string }> = {
  small: {
    short: 'Rapide',
    label: 'Modèle rapide',
    description: 'Frugal — pour la plupart des tâches.',
  },
  large: {
    short: 'Avancé',
    label: 'Modèle avancé',
    description: 'Plus puissant — tâches complexes.',
  },
};

/**
 * Saisie unifiée : message + barre d'outils intégrée (joindre, Cadre, modèle,
 * envoi) avec menus accessibles. Tout est directement accessible depuis l'input.
 */
export function Composer({
  status,
  modelTier,
  onModelChange,
  frameworks,
  frameworkId,
  onFrameworkChange,
  documents,
  uploading,
  uploadError,
  onUpload,
  onDeleteDoc,
  onSend,
  onStop,
}: {
  status: ChatStatus;
  modelTier: ModelTier;
  onModelChange: (tier: ModelTier) => void;
  frameworks: FrameworkDTO[];
  frameworkId: string | null;
  onFrameworkChange: (id: string | null) => void;
  documents: DocumentDTO[];
  uploading: boolean;
  uploadError: string | null;
  onUpload: (files: FileList | null) => void;
  onDeleteDoc: (id: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = status === 'submitted' || status === 'streaming';

  // Dictée (parole → texte) via Whisper.
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const startRecording = async () => {
    setVoiceError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('La dictée n’est pas prise en charge par ce navigateur.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        for (const track of stream.getTracks()) track.stop();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setTranscribing(true);
        try {
          const text = await transcribeAudio(blob);
          if (text) {
            setValue((prev) => (prev ? `${prev.trimEnd()} ${text}` : text));
            requestAnimationFrame(() => {
              resize();
              textareaRef.current?.focus();
            });
          }
        } catch (err) {
          setVoiceError(err instanceof Error ? err.message : 'Transcription impossible.');
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setVoiceError('Micro indisponible. Autorisez l’accès au microphone.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const toggleRecording = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    onSend(text);
    setValue('');
    requestAnimationFrame(resize);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const frameworkOptions: MenuOption[] = [
    { value: '', label: 'Aucun cadre', description: 'Conversation libre.' },
    ...frameworks.map((f) => ({
      value: f.id,
      label: f.name,
      description: [f.subject, f.level].filter(Boolean).join(' · ') || undefined,
    })),
  ];
  const activeFramework = frameworks.find((f) => f.id === frameworkId);
  const model = MODEL_OPTIONS[modelTier];

  return (
    <div className="bg-canvas">
      <div className="mx-auto max-w-3xl px-4 pt-3 pb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="rounded-lg border border-border bg-surface shadow-float transition-all duration-200 focus-within:border-accent/50 focus-within:shadow-glow"
        >
          {documents.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2.5">
              {documents.map((document) => (
                <span
                  key={document.id}
                  className="inline-flex animate-pop-in items-center gap-1.5 rounded-button bg-surface-muted px-2 py-1 text-xs"
                  title={document.filename}
                >
                  <FileIcon className="size-3.5 text-accent" />
                  <span className="max-w-[12rem] truncate">{document.filename}</span>
                  <button
                    type="button"
                    onClick={() => onDeleteDoc(document.id)}
                    aria-label={`Retirer ${document.filename}`}
                    className="text-muted-foreground transition-colors hover:text-danger"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <label htmlFor="composer-input" className="sr-only">
            Votre message
          </label>
          <textarea
            id="composer-input"
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              resize();
            }}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Posez votre question ou décrivez votre besoin…"
            className="block max-h-[200px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[0.95rem] leading-relaxed outline-none placeholder:text-muted-foreground/70"
          />

          <div className="flex items-center gap-1.5 px-2.5 pb-2.5">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
              multiple
              className="sr-only"
              onChange={(e) => onUpload(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Joindre un document"
              title="Joindre un document"
              className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-muted hover:text-accent disabled:opacity-60"
            >
              {uploading ? (
                <SpinnerIcon className="size-4" />
              ) : (
                <PaperclipIcon className="size-4" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleRecording}
              disabled={busy || transcribing}
              aria-pressed={recording}
              aria-label={recording ? 'Arrêter la dictée' : 'Dicter le message'}
              title={recording ? 'Arrêter la dictée' : 'Dicter (parole → texte)'}
              className={`inline-flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-60 ${
                recording
                  ? 'animate-pulse bg-danger/10 text-danger'
                  : 'text-muted-foreground hover:bg-surface-muted hover:text-accent'
              }`}
            >
              {transcribing ? (
                <SpinnerIcon className="size-4" />
              ) : recording ? (
                <StopIcon className="size-4" />
              ) : (
                <MicIcon className="size-4" />
              )}
            </button>

            <PopoverMenu
              label="Choisir un Cadre d’usage"
              active={Boolean(frameworkId)}
              value={frameworkId ?? ''}
              onChange={(v) => onFrameworkChange(v || null)}
              options={frameworkOptions}
              footer={
                <Link
                  href="/cadres"
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium text-accent transition-colors hover:bg-surface-muted"
                >
                  Gérer les cadres →
                </Link>
              }
              trigger={
                <>
                  <SparkIcon className="size-3.5" />
                  <span className="max-w-[8rem] truncate">{activeFramework?.name ?? 'Cadre'}</span>
                  <ChevronDownIcon className="size-3.5 opacity-60" />
                </>
              }
            />

            <PopoverMenu
              label="Choisir le modèle"
              value={modelTier}
              onChange={(v) => onModelChange(v as ModelTier)}
              options={MODEL_TIERS.map((tier) => ({
                value: tier,
                label: MODEL_OPTIONS[tier].label,
                description: MODEL_OPTIONS[tier].description,
              }))}
              trigger={
                <>
                  <GaugeIcon className="size-3.5" />
                  <span>{model.short}</span>
                  <ChevronDownIcon className="size-3.5 opacity-60" />
                </>
              }
            />

            <div className="flex-1" />

            {busy ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Arrêter la génération"
                className="inline-flex size-9 items-center justify-center rounded-full bg-surface-muted text-foreground transition-all duration-150 hover:bg-border active:scale-90"
              >
                <StopIcon className="size-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!value.trim()}
                aria-label="Envoyer"
                className="inline-flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-card transition-all duration-150 hover:bg-accent-hover hover:shadow-float active:scale-90 disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
              >
                <ArrowUpIcon className="size-[18px]" />
              </button>
            )}
          </div>
        </form>

        {uploadError || voiceError ? (
          <p role="alert" className="mt-1.5 text-center text-xs text-danger">
            {uploadError ?? voiceError}
          </p>
        ) : recording ? (
          <p className="mt-2 text-center text-xs text-danger">
            ● Enregistrement… parlez, puis appuyez sur ⏹ pour transcrire.
          </p>
        ) : transcribing ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">Transcription en cours…</p>
        ) : (
          <p className="mt-2 text-center text-xs text-muted-foreground/70">
            EduBrain peut se tromper. Vérifiez les informations importantes.
          </p>
        )}
      </div>
    </div>
  );
}
