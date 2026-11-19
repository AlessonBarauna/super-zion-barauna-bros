/** Mapeamento puro de um controle (layout "standard" do navegador) para comandos do jogo. */

export interface PadSnapshot {
  axes: readonly number[];
  /** Estado pressionado de cada botão (índice padrão do Gamepad API). */
  buttons: readonly boolean[];
}

export interface PadCommand {
  moveX: -1 | 0 | 1;
  run: boolean;
  jump: boolean;
  power: boolean;
  pause: boolean;
}

export const DEADZONE = 0.3;

/** A/Cruz = pular; X/Quadrado ou gatilhos = correr; B/Círculo ou Y/Triângulo = poder; Start = pausa. */
export const PAD_BUTTONS = { jump: [0], run: [2, 6, 7], power: [1, 3], left: 14, right: 15, start: 9 } as const;

export function mapPad(s: PadSnapshot, deadzone = DEADZONE): PadCommand {
  const x = s.axes[0] ?? 0;
  const left = x < -deadzone || s.buttons[PAD_BUTTONS.left] === true;
  const right = x > deadzone || s.buttons[PAD_BUTTONS.right] === true;
  const any = (list: readonly number[]): boolean => list.some((i) => s.buttons[i] === true);
  return {
    moveX: left === right ? 0 : left ? -1 : 1,
    run: any(PAD_BUTTONS.run),
    jump: any(PAD_BUTTONS.jump),
    power: any(PAD_BUTTONS.power),
    pause: s.buttons[PAD_BUTTONS.start] === true,
  };
}
