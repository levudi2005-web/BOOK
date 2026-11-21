import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION = 'required_admin_permission';

/** Attach a required `resource.action` permission (e.g. `book.read`) to a route. */
export const RequirePermission = (permission: string) =>
  SetMetadata(REQUIRED_PERMISSION, permission);
