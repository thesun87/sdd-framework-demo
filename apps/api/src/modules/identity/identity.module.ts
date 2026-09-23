// apps/api/src/modules/identity/identity.module.ts
//
// Module xác thực và quản lý tài khoản/phiên (Feature 002-accounts).

import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { envProvider } from '../catalog/env.provider';
import { ErrorEnvelopeFilter } from '../catalog/error-envelope.filter';
import { PgPoolLifecycle, pgPoolProvider } from '../catalog/pg-pool.provider';
import { IdentityController } from './identity.controller';
import { IdentityRepository } from './identity.repository';
import { IdentityService } from './identity.service';

@Module({
  controllers: [IdentityController],
  providers: [
    envProvider,
    pgPoolProvider,
    PgPoolLifecycle,
    IdentityRepository,
    IdentityService,
    { provide: APP_FILTER, useClass: ErrorEnvelopeFilter },
  ],
  exports: [IdentityService, IdentityRepository],
})
export class IdentityModule {}
