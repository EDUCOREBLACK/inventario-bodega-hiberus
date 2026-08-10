import { Request, Response, NextFunction } from 'express';

export const logger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const { method, url, ip } = req;

    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        console.log(`${method} ${url} ${status} - ${duration}ms - ${ip}`);
    });

    next();
};