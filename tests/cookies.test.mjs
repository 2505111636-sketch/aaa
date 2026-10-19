import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCookies} from './cookies.mjs';
test('hosting cookies do not overwrite the application session',()=>{
 const first=mergeCookies('', ['rr_session=application-token; HttpOnly; Secure; SameSite=Strict']);
 const next=mergeCookies(first,['__cf_bm=hosting-cookie; HttpOnly; Secure']);
 assert.equal(next,'rr_session=application-token; __cf_bm=hosting-cookie');
});
test('logout removes only the expired application cookie',()=>{
 assert.equal(mergeCookies('rr_session=old; __cf_bm=host',['rr_session=; Max-Age=0; Path=/']),'__cf_bm=host');
});
