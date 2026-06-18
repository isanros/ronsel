import type { Split } from '../types/activity';
import { formatDurationSpeech, formatPaceSpeech } from './format';

export function speak(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.rate = 1;
  utterance.pitch = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function vibrate(pattern: number | number[] = [120, 60, 120]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

export function announceSplit(split: Split): void {
  const text = `Kilómetro ${split.km}. Tiempo total ${formatDurationSpeech(split.elapsedMs)}. Parcial ${formatPaceSpeech(split.splitElapsedMs)}.`;
  speak(text);
  vibrate();
}
