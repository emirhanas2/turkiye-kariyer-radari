import test from 'node:test';
import assert from 'node:assert/strict';
import {createSources,parse,slugifyLocation,sources} from './collector.js';
test('İlan URLleri: yabancı host, kategori ve tekrarlar dışlanır',()=>{
 const source=sources[0];
 const html='<a href="/tr/acme/iletisim-stajyeri_42/?ref=1"><h3>İletişim Stajyeri</h3></a><a href="/tr/acme/iletisim-stajyeri_42/">Tekrar</a><a href="https://evil.test/tr/acme/job_5/">Yanlış kaynak</a><a href="/tr/is-ilanlari/istanbul/">Kategori</a>';
 const result=parse(html,source);assert.equal(result.length,1);assert.equal(result[0].relevant,true);assert.equal(result[0].location,'');assert.equal(result[0].url,'https://www.youthall.com/tr/acme/iletisim-stajyeri_42/');
});
test('İşin Olsun kategori bağlantısı ilan değildir',()=>{
 const result=parse('<a href="/is-ilanlari/istanbul-magaza">Kategori</a><a href="/is-ilani/icerik-uzmani-123">İçerik Uzmanı</a>',sources[1]);assert.equal(result.length,1);
});
test('Genel staj ilanı önerilir, yönetici ilanı önerilmez',()=>{
 const source=sources[0];
 const html='<a href="/tr/acme/genel-staj-programi_1/"><h5>Genel Staj Programı</h5></a><a href="/tr/acme/iletisim-muduru_2/"><h5>Kurumsal İletişim Müdürü</h5></a><a href="/tr/acme/muhasebe-uzman-yardimcisi_3/"><h5>Muhasebe Uzman Yardımcısı</h5></a>';
 const result=parse(html,source);assert.equal(result.length,3);assert.equal(result[0].relevant,true);assert.equal(result[1].relevant,false);assert.equal(result[2].relevant,false);
});
test('Şehir seçimi tüm kaynak adreslerine uygulanır',()=>{
 const ankara=createSources('Ankara');
 assert.ok(ankara.every(source=>source.urls.every(url=>url.toLocaleLowerCase('tr').includes('ankara'))));
 assert.equal(slugifyLocation('Çanakkale'),'canakkale');
 const turkey=createSources('Tüm Türkiye');
 assert.equal(turkey[1].url,'https://isinolsun.com/is-ilanlari');
 assert.match(turkey[3].url,/location=T%C3%BCrkiye/);
});
