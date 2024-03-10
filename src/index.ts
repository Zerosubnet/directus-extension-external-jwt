import { defineHook } from '@directus/extensions-sdk';
import { getAccountabilityForToken } from './external-jwt/get-accountability-for-token';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import type {HookConfig} from '@directus/extensions'
import type { Accountability, EventContext } from '@directus/types';

export default defineHook<HookConfig>(({ filter }) => {
	
	// get all configuration
	
	filter('authenticate', (defaultAccountability: Accountability, event, context: EventContext)  => {
		const req = <Request>event['req'];
		if(!req.token) return defaultAccountability;

		if(!context.database) {
			return defaultAccountability
		}

		

		const decodedToken = jwt.decode(req.token);
		
		if(typeof decodedToken === 'string' || decodedToken == null) return defaultAccountability; // if token is not a jwt, let directus handle it
		if(decodedToken?.iss == 'directus') return defaultAccountability; // if token issued by directus, let directus handle it


		

		return getAccountabilityForToken(req.token, decodedToken?.iss, context.accountability, context.database)
	});

	/*filter('auth.jwt', (status, user, provider) => {

	})*/

});


