import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'nexa-attend-backend' },
  silent: process.env.NODE_ENV === 'test',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, ...meta }) =>
            `[${timestamp}] ${level}: ${message} ${
              Object.keys(meta).length && meta.service !== 'nexa-attend-backend'
                ? JSON.stringify(meta)
                : ''
            }`
        )
      )
    })
  ]
});

export default logger;
