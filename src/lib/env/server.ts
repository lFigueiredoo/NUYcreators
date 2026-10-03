import 'server-only';
import { parseEnvironment } from './schema';
export function getEnvironment() {
  return parseEnvironment(process.env);
}
