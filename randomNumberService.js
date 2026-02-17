const express = require('express');
const seedrandom = require('seedrandom');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const PORT = process.env.PORT || 3000;

// Swagger definition - base options without servers (will be set dynamically)
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Random Number Service API',
      version: '1.0.0',
      description: 'A REST API for generating random numbers based on a seed using seedrandom',
      contact: {
        name: 'API Support'
      }
    }
  },
  apis: ['./randomNumberService.js']
};

const baseSwaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(express.json());

// Custom middleware to add dynamic spec based on request
app.use('/api-docs', (req, res, next) => {
  // Detect protocol - check for X-Forwarded-Proto header first (for proxies/load balancers)
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  
  // Inject the dynamic spec based on the request host
  req.swaggerSpec = {
    ...baseSwaggerSpec,
    servers: [
      {
        url: `${protocol}://${req.get('host')}`,
        description: 'Current Server'
      }
    ]
  };
  next();
});

// Serve Swagger UI with dynamic server URL
app.use('/api-docs', swaggerUi.serve, (req, res) => {
  swaggerUi.setup(req.swaggerSpec, { customCss: '.swagger-ui { font-family: sans-serif; }' })(req, res);
});

// Health check endpoint
/** 
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the service
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 */
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Random number endpoint
/**
 * @swagger
 * /random:
 *   get:
 *     summary: Generate a random number based on a seed (GET)
 *     description: Generates a seeded random number. The same seed will always produce the same random number.
 *     tags:
 *       - Random Number Generator
 *     parameters:
 *       - in: query
 *         name: seed
 *         schema:
 *           type: string
 *         required: true
 *         description: The seed value for the random number generator
 *         example: "12345"
 *     responses:
 *       200:
 *         description: Random number generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 seed:
 *                   type: string
 *                   example: "12345"
 *                 randomNumber:
 *                   type: number
 *                   example: 0.8274234145132841
 *                 message:
 *                   type: string
 *                   example: "Random number generated successfully"
 *       400:
 *         description: Missing seed parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Seed parameter is required"
 *       500:
 *         description: Internal server error
 */
app.get('/random', (req, res) => {
  const seed = req.query.seed;

  if (!seed) {
    return res.status(400).json({
      error: 'Seed parameter is required',
      example: '/random?seed=12345'
    });
  }

  try {
    // Create a seeded random number generator
    const rng = seedrandom(seed.toString());
    // Generate a random number between 0 and 1
    const randomNumber = rng();

    res.json({
      seed: seed,
      randomNumber: randomNumber,
      message: 'Random number generated successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate random number',
      details: error.message
    });
  }
});

// POST endpoint alternative
/**
 * @swagger
 * /random:
 *   post:
 *     summary: Generate a random number based on a seed (POST)
 *     description: Generates a seeded random number using JSON body. The same seed will always produce the same random number.
 *     tags:
 *       - Random Number Generator
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               seed:
 *                 type: string
 *                 description: The seed value for the random number generator
 *                 example: "12345"
 *             required:
 *               - seed
 *     responses:
 *       200:
 *         description: Random number generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 seed:
 *                   type: string
 *                   example: "12345"
 *                 randomNumber:
 *                   type: number
 *                   example: 0.8274234145132841
 *                 message:
 *                   type: string
 *                   example: "Random number generated successfully"
 *       400:
 *         description: Missing seed parameter
 *       500:
 *         description: Internal server error
 */
app.post('/random', (req, res) => {
  const seed = req.body.seed;

  if (!seed) {
    return res.status(400).json({
      error: 'Seed parameter is required in request body',
      example: { seed: '12345' }
    });
  }

  try {
    const rng = seedrandom(seed.toString());
    const randomNumber = rng();

    res.json({
      seed: seed,
      randomNumber: randomNumber,
      message: 'Random number generated successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate random number',
      details: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: {
      'GET /health': 'Health check',
      'GET /random?seed=VALUE': 'Generate random number (query parameter)',
      'POST /random': 'Generate random number (body parameter)'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Random Number Service is running on http://localhost:${PORT}`);  console.log(`\nAPI Documentation: http://localhost:${PORT}/api-docs`);  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /health - Health check`);
  console.log(`  GET  /random?seed=<seed> - Get random number (query parameter)`);
  console.log(`  POST /random - Get random number (JSON body with seed property)`);
});