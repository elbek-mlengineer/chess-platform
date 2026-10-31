import { Global, Module } from '@nestjs/common';
import { BACKEND_CONFIG, loadBackendConfig } from './backend-config';

@Global()
@Module({
  providers: [
    { provide: BACKEND_CONFIG, useFactory: () => loadBackendConfig() },
  ],
  exports: [BACKEND_CONFIG],
})
export class BackendConfigModule {}
