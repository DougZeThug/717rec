
import { BracketsManager } from 'brackets-manager';
import { bracketsAdapter } from './adapter/BracketsManagerAdapter';

export const manager = new BracketsManager(bracketsAdapter as any);
