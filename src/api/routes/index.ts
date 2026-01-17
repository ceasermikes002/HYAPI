import { Router } from 'express';
import { HyperliquidDataSource } from '../../datasources/hyperliquid/index.js';
import { TradeService } from '../../services/tradeService.js';
import { PositionService } from '../../services/positionService.js';
import { LeaderboardService } from '../../services/leaderboardService.js';
import { LedgerService } from '../../services/ledgerService.js';
import { PnlService } from '../../services/pnlService.js';

const router = Router();

const dataSource = new HyperliquidDataSource();
const tradeService = new TradeService(dataSource);
const positionService = new PositionService(dataSource);
const pnlService = new PnlService(dataSource);
const leaderboardService = new LeaderboardService(pnlService);
const ledgerService = new LedgerService(dataSource);

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Root
 *     description: Returns API status and version information.
 *     responses:
 *       200:
 *         description: API Status
 */
router.get('/', (req, res) => {
    res.json({
        message: 'HYAPI - Hyperliquid Analytics',
        version: '1.0.0',
        docs: '/api-docs',
        endpoints: [
            '/trades',
            '/positions/history',
            '/pnl',
            '/leaderboard',
            '/deposits'
        ]
    });
});

/**
 * @swagger
 * /trades:
 *   get:
 *     summary: Retrieve trade history for a user
 *     description: Fetches normalized trade fills from the Hyperliquid ledger. Supports time filtering and builder-attribution filtering.
 *     parameters:
 *       - in: query
 *         name: user
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet address of the user
 *       - in: query
 *         name: coin
 *         schema:
 *           type: string
 *         description: Filter by specific coin symbol (e.g., BTC-PERP)
 *       - in: query
 *         name: fromMs
 *         schema:
 *           type: integer
 *         description: Start timestamp in milliseconds
 *       - in: query
 *         name: toMs
 *         schema:
 *           type: integer
 *         description: End timestamp in milliseconds
 *       - in: query
 *         name: builderOnly
 *         schema:
 *           type: boolean
 *         description: If true, filters trades attributed to the configured TARGET_BUILDER
 *     responses:
 *       200:
 *         description: A list of trades
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Trade'
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Internal Server Error
 */
router.get('/trades', async (req, res) => {
    try {
        const { user, coin, fromMs, toMs, builderOnly } = req.query;
        
        // Input Validation Layer
        // Ideally, use Zod or Joi middleware here for strict validation.
        if (!user || typeof user !== 'string') {
             res.status(400).json({ error: 'User is required' });
             return;
        }

        const result = await tradeService.getTrades({
            user,
            coin: coin as string,
            fromMs: fromMs ? parseInt(fromMs as string) : undefined,
            toMs: toMs ? parseInt(toMs as string) : undefined,
            builderOnly: builderOnly === 'true'
        });
        res.json(result);
    } catch (e) {
        console.error('[API Error] /trades:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /positions/history:
 *   get:
 *     summary: Reconstruct position history
 *     description: Replays trade history to reconstruct the position state (Net Size, Avg Entry Price) over time. Essential for visualizing performance.
 *     parameters:
 *       - in: query
 *         name: user
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: coin
 *         schema:
 *           type: string
 *       - in: query
 *         name: fromMs
 *         schema:
 *           type: integer
 *       - in: query
 *         name: toMs
 *         schema:
 *           type: integer
 *       - in: query
 *         name: builderOnly
 *         schema:
 *           type: boolean
 *         description: If true, flags positions as 'tainted' if non-builder trades affect the lifecycle.
 *     responses:
 *       200:
 *         description: Time-ordered position states
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PositionState'
 */
router.get('/positions/history', async (req, res) => {
    try {
        const { user, coin, fromMs, toMs, builderOnly } = req.query;
        if (!user || typeof user !== 'string') {
             res.status(400).json({ error: 'User is required' });
             return;
        }
        const result = await positionService.getPositionHistory({
            user,
            coin: coin as string,
            fromMs: fromMs ? parseInt(fromMs as string) : undefined,
            toMs: toMs ? parseInt(toMs as string) : undefined,
            builderOnly: builderOnly === 'true'
        });
        res.json(result);
    } catch (e) {
        console.error('[API Error] /positions/history:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /pnl:
 *   get:
 *     summary: Calculate PnL Metrics
 *     description: Computes Realized PnL, Return %, Fees, and Volume. Handles effective capital approximation for Return % calculation.
 *     parameters:
 *       - in: query
 *         name: user
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: coin
 *         schema:
 *           type: string
 *       - in: query
 *         name: fromMs
 *         schema:
 *           type: integer
 *       - in: query
 *         name: toMs
 *         schema:
 *           type: integer
 *       - in: query
 *         name: builderOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: maxStartCapital
 *         schema:
 *           type: number
 *         description: Cap the starting capital for Return % normalization (fair competition mode).
 *     responses:
 *       200:
 *         description: PnL metrics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PnlMetrics'
 */
router.get('/pnl', async (req, res) => {
    try {
        const { user, coin, fromMs, toMs, builderOnly, maxStartCapital } = req.query;
        if (!user || typeof user !== 'string') {
             res.status(400).json({ error: 'User is required' });
             return;
        }
        const result = await pnlService.getPnl({
            user,
            coin: coin as string,
            fromMs: fromMs ? parseInt(fromMs as string) : undefined,
            toMs: toMs ? parseInt(toMs as string) : undefined,
            builderOnly: builderOnly === 'true',
            maxStartCapital: maxStartCapital ? parseFloat(maxStartCapital as string) : undefined
        });
        res.json(result);
    } catch (e) {
        console.error('[API Error] /pnl:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /leaderboard:
 *   get:
 *     summary: Get Leaderboard
 *     description: Ranks tracked users based on a specified metric.
 *     parameters:
 *       - in: query
 *         name: metric
 *         required: true
 *         schema:
 *           type: string
 *           enum: [volume, pnl, returnPct]
 *       - in: query
 *         name: coin
 *         schema:
 *           type: string
 *       - in: query
 *         name: fromMs
 *         schema:
 *           type: integer
 *       - in: query
 *         name: toMs
 *         schema:
 *           type: integer
 *       - in: query
 *         name: builderOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: maxStartCapital
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Ranked leaderboard entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LeaderboardEntry'
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const { coin, fromMs, toMs, metric, builderOnly, maxStartCapital } = req.query;
        if (!metric || typeof metric !== 'string') {
             res.status(400).json({ error: 'Metric is required (volume|pnl|returnPct)' });
             return;
        }
        const result = await leaderboardService.getLeaderboard({
            coin: coin as string,
            fromMs: fromMs ? parseInt(fromMs as string) : undefined,
            toMs: toMs ? parseInt(toMs as string) : undefined,
            metric: metric as 'volume'|'pnl'|'returnPct',
            builderOnly: builderOnly === 'true',
            maxStartCapital: maxStartCapital ? parseFloat(maxStartCapital as string) : undefined
        });
        res.json(result);
    } catch (e) {
        console.error('[API Error] /leaderboard:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /deposits:
 *   get:
 *     summary: Get Deposits
 *     description: Retrieves deposit history to identify capital reloading during competitions.
 *     parameters:
 *       - in: query
 *         name: user
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: fromMs
 *         schema:
 *           type: integer
 *       - in: query
 *         name: toMs
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deposit summary and list
 */
router.get('/deposits', async (req, res) => {
    try {
        const { user, fromMs, toMs } = req.query;
        if (!user || typeof user !== 'string') {
             res.status(400).json({ error: 'User is required' });
             return;
        }
        const result = await ledgerService.getDeposits(
            user,
            fromMs ? parseInt(fromMs as string) : undefined,
            toMs ? parseInt(toMs as string) : undefined
        );
        res.json(result);
    } catch (e) {
        console.error('[API Error] /deposits:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /leaderboard/users:
 *   post:
 *     summary: Add User to Leaderboard
 *     description: Registers a user address to be tracked by the leaderboard service. In a production environment, this would likely be an authenticated endpoint or hooked into a user registration event.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *                 description: Wallet address
 *     responses:
 *       200:
 *         description: User added successfully
 */
router.post('/leaderboard/users', (req, res) => {
    const { user } = req.body;
    if (user && typeof user === 'string') {
        leaderboardService.addUser(user);
        res.json({ success: true, message: 'User added to leaderboard tracking' });
    } else {
        res.status(400).json({ error: 'Invalid user' });
    }
});

export default router;
