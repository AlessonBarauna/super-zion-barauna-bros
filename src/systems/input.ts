import Phaser from 'phaser';
import type { PlayerControls } from './movement';

/** Fonte de comandos de um jogador. A arquitetura permite plugar teclado, gamepad ou IA. */
export interface ControlSource {
  poll(): PlayerControls;
}

export interface InputProfile {
  left: string[];
  right: string[];
  jump: string[];
  run: string[];
  power: string[];
}

/**
 * Perfis de teclado conforme o GDD. No cooperativo (Fase 4), P1 e P2 usam conjuntos
 * independentes. Teclas extras (↑/W para pular, P para pausar) são conveniências.
 */
export const INPUT_PROFILES = {
  /** Zion (jogador 1) e modo individual. */
  player1: {
    left: ['A', 'LEFT'],
    right: ['D', 'RIGHT'],
    jump: ['SPACE', 'UP', 'W'],
    run: ['SHIFT'],
    power: ['X'],
  },
  /** Bara (jogador 2, cooperativo local). */
  player2: {
    left: ['J'],
    right: ['L'],
    jump: ['I'],
    run: ['K'],
    power: ['U'],
  },
} as const satisfies Record<string, InputProfile>;

const codeOf = (name: string): number => {
  const code = (Phaser.Input.Keyboard.KeyCodes as unknown as Record<string, number>)[name];
  if (code === undefined) throw new Error(`Tecla desconhecida: ${name}`);
  return code;
};

export class KeyboardControls implements ControlSource {
  private readonly left: Phaser.Input.Keyboard.Key[];
  private readonly right: Phaser.Input.Keyboard.Key[];
  private readonly jump: Phaser.Input.Keyboard.Key[];
  private readonly run: Phaser.Input.Keyboard.Key[];
  private readonly power: Phaser.Input.Keyboard.Key[];

  constructor(scene: Phaser.Scene, profile: InputProfile) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('Teclado indisponível');
    const keys = (names: string[]): Phaser.Input.Keyboard.Key[] => names.map((n) => kb.addKey(codeOf(n), false));
    this.left = keys(profile.left);
    this.right = keys(profile.right);
    this.jump = keys(profile.jump);
    this.run = keys(profile.run);
    this.power = keys(profile.power);
  }

  poll(): PlayerControls {
    const l = this.left.some((k) => k.isDown);
    const r = this.right.some((k) => k.isDown);
    const moveX = l === r ? 0 : l ? -1 : 1;
    return {
      moveX,
      run: this.run.some((k) => k.isDown),
      jumpPressed: this.jump.some((k) => Phaser.Input.Keyboard.JustDown(k)),
      jumpHeld: this.jump.some((k) => k.isDown),
      powerPressed: this.power.some((k) => Phaser.Input.Keyboard.JustDown(k)),
    };
  }
}
