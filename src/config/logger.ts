import { dirname } from '@darkobits/fd-name';
import path from 'node:path';
import winston, { format } from 'winston';
import { required } from '../lib/utils.ts';
const { combine, timestamp, printf, colorize } = format;

export type LogLevel = 'error' | 'warn' | 'info';

const timeFormat = (): string => {
  return new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }).replace(',', '');
};

const fileLogFormat = printf(({ level, message, timestamp }) => {
  return `${String(timestamp)} ${level}: ${String(message)}`;
});

const consoleLogFormat = printf(({ level, message }) => {
  return `${level}: ${String(message)}`;
});

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.File({
      filename: path.join(required(dirname()), '../../logs/app.log'),
      format: combine(timestamp({ format: timeFormat }), fileLogFormat),
    }),
    new winston.transports.Console({
      format: combine(colorize(), consoleLogFormat),
    }),
  ],
});

export default logger;
