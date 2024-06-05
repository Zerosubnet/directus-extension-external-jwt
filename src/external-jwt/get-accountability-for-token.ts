import type { Accountability } from '@directus/types';
import { getAuthProviders } from './authProvider/get-auth-providers.js';

import { verify_token } from './verify-token.js';
import { CacheEnabled, CacheGet, CacheSet } from './cache.js';
import type { Knex } from 'knex';


const authProviders = await getAuthProviders();

/*
const MissingJWTHeaderError = createError('INVALID_JWKS_ISSUER_ERROR', 'No header in JWT Token', 500);
const NoValidKeysError = createError('INVALID_JWKS_ISSUER_ERROR', 'could not retrieve any valid keys with key id(kid)', 500);
const NoAuthProvidersError = createError('INVALID_JWKS_ISSUER_ERROR', 'No auth providers in the list', 500);
*/

// TODO: optimize this function, reduce the amount of loops


export async function getAccountabilityForToken(
	token: string | null,
	iss: string[] | string | undefined,
	accountability: Accountability | null,
	database: Knex
): Promise<Accountability> {
    if (accountability == null) {
		accountability = {
			user: null,
			role: null,
			admin: false,
			app: false,
		};
	}

	if (token == null || iss == null) {
		
		return accountability
	}
	
	const providers = authProviders.filter((provider) => provider.issuer_url && iss.includes(provider.issuer_url));
	
	if(providers.length === 0) return accountability;
	if(providers.length > 1) {
		return accountability;
	}
	

	const provider = providers[0];

	

	try {

		
		const result = await verify_token(provider, token)

		
		
		if(provider.use_database) { // use database to get user
			// TODO: Add caching to this function
			if (CacheEnabled() && result.sub) {
				
				const cachedAccountability = await CacheGet(result.sub);
				if (cachedAccountability) {
					return cachedAccountability;
				}
			}

			const user = await database
				.select('directus_users.id', 'directus_users.role', 'directus_roles.admin_access', 'directus_roles.app_access')
				.from('directus_users')
				.leftJoin('directus_roles', 'directus_users.role', 'directus_roles.id')
				.where({
					'directus_users.external_identifier': result.sub,
					'directus_users.provider': provider.name,
				})
				.first();
			
			if(!user) {
				return accountability;
			}

			accountability.user = user.id;
			accountability.role = user.role;
			accountability.admin = user.admin_access === true || user.admin_access == 1;
			accountability.app = user.app_access === true || user.app_access == 1;

			if (CacheEnabled() && result.sub) {
				CacheSet(result.sub, accountability);
			}
			

			return accountability;
		} 

		// check if role key is set else try role key
		if(provider.role_key != null) {
			if(typeof result[provider.role_key] === 'string') {
				accountability.role = result[provider.role_key];
			}
			if(typeof result[provider.role_key] === 'object') {
				accountability.role = ''
			}
			if(result[provider.role_key].instanceOf(Array)) {
				accountability.role = result[provider.role_key][0];
			}
		}

		if(provider.admin_key != null) {
			accountability.admin = result[provider.admin_key];
		}
		if(provider.app_key != null) {
			accountability.app = result[provider.app_key];
		}
		accountability.user = result.sub;
	
	} catch (error) {
		return accountability;
	}
	
	
	return accountability;

}