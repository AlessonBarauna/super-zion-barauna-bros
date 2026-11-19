import { browserStorage, SaveManager } from '../systems/save';

/** Instância única do salvamento, carregada na abertura do jogo. */
export const saveManager = new SaveManager(browserStorage());
saveManager.load();
