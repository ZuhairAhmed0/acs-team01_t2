import { Router } from 'express';
import {
  createStation,
  deleteStation,
  getStationById,
  listStations,
  updateStation,
} from '../controllers/stations.controller.js';
import { requireApiAuth } from '../middleware/auth.js';
import { ensureUser } from '../middleware/ensure-user.js';
import { validate } from '../middleware/validate.js';
import {
  createStationSchema,
  stationIdParamSchema,
  stationListQuerySchema,
  updateStationSchema,
} from '../schemas/station.js';

export const stationsRouter = Router();

stationsRouter.use(requireApiAuth, ensureUser);

stationsRouter.get(
  '/',
  validate({ query: stationListQuerySchema }),
  listStations,
);
stationsRouter.get(
  '/:id',
  validate({ params: stationIdParamSchema }),
  getStationById,
);
stationsRouter.post(
  '/',
  validate({ body: createStationSchema }),
  createStation,
);
stationsRouter.patch(
  '/:id',
  validate({ params: stationIdParamSchema, body: updateStationSchema }),
  updateStation,
);
stationsRouter.delete(
  '/:id',
  validate({ params: stationIdParamSchema }),
  deleteStation,
);
