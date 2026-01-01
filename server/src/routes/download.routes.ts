import express, { type Router } from 'express';
import { downloadSampleExcel } from '../controllers/download.controller.ts';

const router: Router = express.Router();

router.get('/sample-excel', downloadSampleExcel);

export default router;
