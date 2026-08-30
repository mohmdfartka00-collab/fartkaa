let sb=null;
const cfg=window.FARTAKA_SUPABASE_CONFIG||{}, payCfg=window.FARTAKA_PAYMENT_CONFIG||{};
if(window.supabase&&cfg.supabase_url&&cfg.supabase_publishable_key) sb=window.supabase.createClient(cfg.supabase_url,cfg.supabase_publishable_key);
const cats=[['الكل','✨'],['إلكترونيات','📱'],['منزل','🏠'],['أزياء','👕'],['أطفال','🧸'],['رياضة','⚽'],['جمال','💄'],['مستلزمات','🧰']];
let products=[],activeCat='الكل',cart=JSON.parse(localStorage.getItem('fartaka_cart')||'[]'),favorites=new Set(JSON.parse(localStorage.getItem('fartaka_favorites')||'[]')),currentUser=null,isAdmin=false,visibleCount=12,coupon=null,siteSettings={};
const $=id=>document.getElementById(id);
function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function money(n){return Number(n||0).toLocaleString('ar-EG',{maximumFractionDigits:2})}
function toast(t){const x=$('toast');if(!x)return;x.textContent=t;x.classList.add('show');clearTimeout(window._toast);window._toast=setTimeout(()=>x.classList.remove('show'),3000)}
function openModal(id){
  const el=$(id); if(!el)return;
  el.hidden=false;
  el.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}
function closeModal(id){
  const el=$(id); if(!el)return;
  el.hidden=true;
  el.setAttribute('aria-hidden','true');
  if(!document.querySelector('.modal:not([hidden])')) document.body.classList.remove('modal-open');
}
function closeSearch(){ closeModal('searchModal'); }

function saveLocal(){localStorage.setItem('fartaka_cart',JSON.stringify(cart));localStorage.setItem('fartaka_favorites',JSON.stringify([...favorites]))}
async function init(){
  $('categoriesGrid').innerHTML=cats.slice(1).map(c=>`<button class="category" onclick="filterCat('${esc(c[0])}')"><div class="ico">${c[1]}</div><b>${esc(c[0])}</b></button>`).join('');
  $('chips').innerHTML=cats.map(c=>`<button class="chip ${c[0]==='الكل'?'active':''}" onclick="filterCat('${esc(c[0])}')">${c[1]} ${esc(c[0])}</button>`).join('');
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') document.querySelectorAll('.modal:not([hidden])').forEach(m=>closeModal(m.id));
  });
  document.querySelectorAll('.modal').forEach(m=>{
    m.addEventListener('click',e=>{ if(e.target===m) closeModal(m.id); });
  });
  document.querySelectorAll('.modal .close').forEach(btn=>{
    btn.type='button';
    btn.addEventListener('click',e=>{
      e.preventDefault(); e.stopPropagation();
      const modal=btn.closest('.modal');
      if(modal) closeModal(modal.id);
    });
  });
  if(sb){const {data:{session}}=await sb.auth.getSession();if(session)await setUser(session.user);sb.auth.onAuthStateChange((_e,s)=>setUser(s?.user||null));}
  await loadSite();await loadProducts();updateCart();renderAccount();handlePaymentReturn();
}

async function handlePaymentReturn(){
  const q=new URLSearchParams(location.search);
  if(q.get('payment')!=='return'||!q.get('order_id')||!sb)return;
  toast('تم الرجوع من بوابة الدفع. جاري التحقق من حالة الدفع...');
  const id=q.get('order_id');
  setTimeout(async()=>{
    const {data}=await sb.from('orders').select('order_number,tracking_number,status,payment_status').eq('id',id).maybeSingle();
    if(data){
      if(data.payment_status==='paid') toast('تم الدفع بنجاح ✅');
      else toast('الدفع قيد التحقق. تقدر تتابع الطلب من رقم الطلب.');
    }
    history.replaceState({},document.title,location.pathname+location.hash);
  },1500);
}

async function setUser(user){currentUser=user||null;isAdmin=false;if(user&&sb){const {data}=await sb.from('profiles').select('full_name,phone,address,city,role').eq('id',user.id).maybeSingle();isAdmin=data?.role==='admin';}renderAccount()}
async function loadSite(){if(!sb)return;const {data}=await sb.from('site_settings').select('*').limit(1).maybeSingle();if(data){siteSettings=data;if(data.hero_title)document.querySelector('.hero h1').innerHTML=esc(data.hero_title).replace(/\n/g,'<br>');if(data.hero_text)document.querySelector('.hero p').textContent=data.hero_text;if(data.hero_image)document.querySelector('.hero').style.backgroundImage=`linear-gradient(90deg,#f8f6fbf0,#f8f6fbd9),url(\"${data.hero_image}\")`;}}
async function loadProducts(){if(!sb){toast('الاتصال بقاعدة البيانات غير جاهز');return}const {data,error}=await sb.from('products').select('*').order('created_at',{ascending:false});if(error){console.error(error);toast('حصل خطأ في تحميل المنتجات');return}products=(data||[]).map(p=>({id:p.id,name:p.name,price:+p.price,old:+(p.old_price||p.price),cat:p.category||'عام',source:p.store||'متجر خارجي',url:p.affiliate_url||'#',description:p.description||'',image:p.image_url||'',emoji:'🛍️',stock:p.stock??999,rating:+(p.rating||0),reviews:+(p.review_count||0)}));buildStoreFilter();renderProducts();if(isAdmin)renderAdmin()}
function buildStoreFilter(){const stores=[...new Set(products.map(p=>p.source).filter(Boolean))];$('storeFilter').innerHTML='<option value="">كل المتاجر</option>'+stores.map(s=>`<option>${esc(s)}</option>`).join('')}
function getList(){let list=activeCat==='الكل'?[...products]:products.filter(p=>p.cat===activeCat);const min=+$('minPrice').value||0,max=+$('maxPrice').value||Infinity,store=$('storeFilter').value,sale=$('saleOnly').checked;list=list.filter(p=>p.price>=min&&p.price<=max&&(!store||p.source===store)&&(!sale||p.old>p.price));const s=$('sort').value;if(s==='low')list.sort((a,b)=>a.price-b.price);if(s==='high')list.sort((a,b)=>b.price-a.price);if(s==='discount')list.sort((a,b)=>((b.old-b.price)/b.old)-((a.old-a.price)/a.old));return list}
function renderProducts(){const list=getList(),grid=$('productsGrid');grid.innerHTML=list.slice(0,visibleCount).map(card).join('')||'<div class="empty">مفيش منتجات مطابقة للفلاتر.</div>';$('moreBtn').hidden=list.length<=visibleCount}
function showMore(){visibleCount+=12;renderProducts()}
function safeAffiliate(url){try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)?u.href:'#'}catch{return '#'}}
function affiliateButton(p,cls='btn ghost'){const url=safeAffiliate(p.url);return url==='#'?'<button class="btn ghost" disabled>رابط الشراء غير متاح</button>':`<a class="${cls}" href="${esc(url)}" target="_blank" rel="nofollow sponsored noopener" onclick="trackAffiliateClick(${p.id})">شراء من المتجر الأصلي ↗</a>`}
async function trackAffiliateClick(id){if(sb&&currentUser){await sb.from('affiliate_clicks').insert({user_id:currentUser.id,product_id:id}).catch(()=>{})}}
function card(p){const visual=p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`:p.emoji;const discount=p.old>p.price?Math.round((1-p.price/p.old)*100):0;const fav=favorites.has(p.id)?'♥':'♡';return `<article class="card"><button class="fav" onclick="toggleFav(${p.id})">${fav}</button><span class="source">${esc(p.source)}</span><button class="cardClick" onclick="openProduct(${p.id})"><div class="cardImg">${visual}</div><div class="cardBody"><small>${esc(p.cat)}</small><h3>${esc(p.name)}</h3><div class="rating">${p.rating?'★'.repeat(Math.min(5,Math.round(p.rating))):'☆'} <span>${p.reviews?`(${p.reviews})`:'جديد'}</span></div>${discount?`<span class="discount">خصم ${discount}%</span>`:''}<div class="price">${money(p.price)} ج ${p.old>p.price?`<span class="old">${money(p.old)} ج</span>`:''}</div></div></button><div class="cardActions"><button class="add" onclick="addToCart(${p.id})">🛒 للسلة</button>${affiliateButton(p,'buy')}</div></article>`}
function filterCat(cat){activeCat=cat;visibleCount=12;document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x.textContent.includes(cat)));renderProducts();$('products').scrollIntoView({behavior:'smooth'})}
function toggleFilters(){$('filters').hidden=!$('filters').hidden}
function toggleFav(id){if(!currentUser){toast('سجّل الدخول عشان تحفظ المفضلة');openAccount();return}favorites.has(id)?favorites.delete(id):favorites.add(id);saveLocal();renderProducts();if(sb)sb.from('favorites').upsert({user_id:currentUser.id,product_id:id}).then(()=>{});toast(favorites.has(id)?'تمت الإضافة للمفضلة':'تمت الإزالة من المفضلة')}
function addToCart(id){const p=products.find(x=>x.id===id);if(!p)return;if(p.stock<=0){toast('المنتج غير متاح حاليًا');return}const item=cart.find(x=>x.id===id);if(item)item.qty=(item.qty||1)+1;else cart.push({...p,qty:1});saveLocal();updateCart();toast('تمت إضافة المنتج للسلة')}
function removeCart(id){cart=cart.filter(x=>x.id!==id);saveLocal();updateCart()}
function changeQty(id,d){const x=cart.find(p=>p.id===id);if(!x)return;x.qty=Math.max(1,(x.qty||1)+d);saveLocal();updateCart()}
function subtotal(){return cart.reduce((s,p)=>s+p.price*(p.qty||1),0)}
function updateCart(){const count=cart.reduce((s,p)=>s+(p.qty||1),0);$('count').textContent=count;$('cartItems').innerHTML=cart.length?cart.map(p=>`<div class="cartRow"><div class="cartThumb">${p.image?`<img src="${esc(p.image)}">`:'🛍️'}</div><div class="cartInfo"><b>${esc(p.name)}</b><small>${money(p.price)} ج</small><div class="qty"><button onclick="changeQty(${p.id},-1)">−</button><b>${p.qty||1}</b><button onclick="changeQty(${p.id},1)">+</button></div></div><button class="remove" onclick="removeCart(${p.id})">×</button></div>`).join(''):'<div class="empty">السلة فاضية. اختار منتج وابدأ التسوق.</div>';let total=subtotal();if(coupon?.percent)total*=1-coupon.percent/100;$('total').textContent=money(total)}
function openCart(){$('cartDrawer').classList.add('open');$('overlay').classList.add('show');updateCart()}function closeCart(){$('cartDrawer').classList.remove('open');$('overlay').classList.remove('show')}
function openSearch(){openModal('searchModal');setTimeout(()=>{$('searchInput')?.focus()},0);searchProducts()}function searchProducts(){const q=$('searchInput').value.trim().toLowerCase();const list=products.filter(p=>(p.name+' '+p.cat+' '+p.source).toLowerCase().includes(q));$('searchResults').innerHTML=list.slice(0,20).map(p=>`<div class="result"><div><b>${esc(p.name)}</b><small>${esc(p.source)} • ${money(p.price)} ج</small></div><button class="btn" onclick="closeSearch();openProduct(${p.id})">عرض</button></div>`).join('')||'<div class="empty">مفيش نتائج مطابقة.</div>'}
function quickSearch(){const q=$('topSearch').value.trim();if(q.length>=2){$('searchInput').value=q;openSearch()}}
function openProduct(id){const p=products.find(x=>x.id===id);if(!p)return;const discount=p.old>p.price?Math.round((1-p.price/p.old)*100):0;$('productDetail').innerHTML=`<div class="productDetail"><div class="detailImage">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}">`:'🛍️'}</div><div class="detailInfo"><span class="source inline">${esc(p.source)}</span><small>${esc(p.cat)}</small><h2>${esc(p.name)}</h2><div class="rating big">${p.rating?'★'.repeat(Math.min(5,Math.round(p.rating))):'☆'} <span>${p.reviews?`${p.reviews} تقييم`:'لا توجد تقييمات بعد'}</span></div><p>${esc(p.description||'منتج مميز متاح للطلب من خلال فرتكه.')}</p><div class="detailPrice">${money(p.price)} ج ${discount?`<del>${money(p.old)} ج</del><em>خصم ${discount}%</em>`:''}</div><div class="detailActions"><button class="btn primary" onclick="addToCart(${p.id});closeModal('productModal');openCart()">أضف للسلة</button>${affiliateButton(p,'btn ghost')}<button class="btn ghost" onclick="toggleFav(${p.id})">${favorites.has(p.id)?'♥ في المفضلة':'♡ أضف للمفضلة'}</button></div><small class="safe">🔒 الدفع بالبطاقة يتم عبر بوابة دفع آمنة، ولا نخزن بيانات البطاقة على الموقع.</small></div></div>`;openModal('productModal')}
function openAccount(){renderAccountView();openModal('accountModal')}
function renderAccount(){const a=document.querySelector('.actions button');if(a)a.title=currentUser?`حساب ${currentUser.email}`:'تسجيل الدخول';$('adminBtn').hidden=!isAdmin}
function renderAccountView(){if(!currentUser){$('accountView').innerHTML=`<h2>حسابك في فرتكه</h2><p>سجّل دخولك عشان تقدر تعمل طلبات وتحفظ المفضلة وتتابع الشحنات.</p><form id="authForm"><div class="authSwitch"><button type="button" id="loginMode" class="active">تسجيل الدخول</button><button type="button" id="registerMode">إنشاء حساب</button></div><input id="authName" placeholder="الاسم" hidden><input id="authEmail" type="email" placeholder="البريد الإلكتروني" required><input id="authPassword" type="password" minlength="6" placeholder="كلمة المرور (6 أحرف على الأقل)" required><button class="btn primary fullBtn">متابعة</button></form><button class="linkBtn" onclick="forgotPassword()">نسيت كلمة المرور؟</button>`;bindAuthModes();return}$('accountView').innerHTML=`<div class="accountHead"><div class="avatar">👤</div><div><h2>أهلًا بيك</h2><p>${esc(currentUser.email)}</p></div></div><div class="accountCards"><button onclick="myOrders()">📦<b>طلباتي</b><small>تتبع كل طلباتك</small></button><button onclick="myFavorites()">❤️<b>المفضلة</b><small>${favorites.size} منتج</small></button><button onclick="profileForm()">⚙️<b>بياناتي</b><small>العنوان والهاتف</small></button></div><button class="btn ghost fullBtn" onclick="signOut()">تسجيل الخروج</button>`}
let registerMode=false;function bindAuthModes(){registerMode=false;$('loginMode').onclick=()=>{registerMode=false;$('loginMode').classList.add('active');$('registerMode').classList.remove('active');$('authName').hidden=true};$('registerMode').onclick=()=>{registerMode=true;$('registerMode').classList.add('active');$('loginMode').classList.remove('active');$('authName').hidden=false};$('authForm').onsubmit=async e=>{e.preventDefault();if(!sb){toast('الاتصال بقاعدة البيانات غير جاهز');return}const email=$('authEmail').value.trim().toLowerCase(),password=$('authPassword').value,name=$('authName').value.trim();let r;if(registerMode)r=await sb.auth.signUp({email,password,options:{data:{full_name:name}}});else r=await sb.auth.signInWithPassword({email,password});if(r.error){toast(r.error.message);return}if(registerMode&&r.data.user){await sb.from('profiles').upsert({id:r.data.user.id,full_name:name});toast(r.data.session?'تم إنشاء الحساب':'راجع بريدك لتأكيد الحساب')}else toast('تم تسجيل الدخول');if(r.data.session)await setUser(r.data.user);renderAccountView()}}
async function signOut(){if(sb)await sb.auth.signOut();currentUser=null;isAdmin=false;renderAccountView();renderAccount()}
async function forgotPassword(){const email=prompt('اكتب بريدك الإلكتروني');if(!email||!sb)return;const r=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.href});toast(r.error?r.error.message:'تم إرسال رابط إعادة التعيين إلى بريدك')}
async function profileForm(){if(!currentUser||!sb)return;const {data}=await sb.from('profiles').select('*').eq('id',currentUser.id).maybeSingle();$('accountView').innerHTML=`<h2>بياناتي</h2><form id="profileForm"><input id="pfName" placeholder="الاسم" value="${esc(data?.full_name||'')}"><input id="pfPhone" placeholder="رقم الهاتف" value="${esc(data?.phone||'')}"><input id="pfAddress" placeholder="العنوان" value="${esc(data?.address||'')}"><input id="pfCity" placeholder="المحافظة / المدينة" value="${esc(data?.city||'')}"><button class="btn primary fullBtn">حفظ البيانات</button></form>`;$('profileForm').onsubmit=async e=>{e.preventDefault();const r=await sb.from('profiles').upsert({id:currentUser.id,full_name:$('pfName').value,phone:$('pfPhone').value,address:$('pfAddress').value,city:$('pfCity').value});toast(r.error?r.error.message:'تم حفظ بياناتك');renderAccountView()}}
async function myOrders(){if(!currentUser){toast('سجّل الدخول');return}const {data,error}=await sb.from('orders').select('id,order_number,total,status,created_at,tracking_number').eq('user_id',currentUser.id).order('created_at',{ascending:false});if(error){toast('تعذر تحميل الطلبات');return}$('accountView').innerHTML=`<h2>طلباتي</h2>${(data||[]).map(o=>`<div class="orderMini"><div><b>${esc(o.order_number)}</b><small>${new Date(o.created_at).toLocaleDateString('ar-EG')} • ${money(o.total)} ج</small></div><span class="status ${esc(o.status)}">${statusText(o.status)}</span><button class="btn" onclick="showTracking('${esc(o.tracking_number||o.order_number)}')">تتبع</button></div>`).join('')||'<div class="empty">لسه مفيش طلبات.</div>'}<button class="linkBtn" onclick="renderAccountView()">رجوع للحساب</button>`}
async function myFavorites(){const list=products.filter(p=>favorites.has(p.id));$('accountView').innerHTML=`<h2>المفضلة ❤️</h2><div class="favList">${list.map(p=>`<div class="favItem"><span>${esc(p.name)}</span><b>${money(p.price)} ج</b><button class="btn" onclick="openProduct(${p.id})">عرض</button></div>`).join('')||'<div class="empty">المفضلة فاضية.</div>'}</div><button class="linkBtn" onclick="renderAccountView()">رجوع للحساب</button>`}
function checkout(){if(!cart.length){toast('السلة فاضية');return}if(!currentUser){toast('سجّل الدخول لإتمام الطلب');openAccount();return}closeCart();renderCheckout();openModal('checkoutModal')}
async function renderCheckout(){const {data}=await sb.from('profiles').select('*').eq('id',currentUser.id).maybeSingle();const total=subtotal()*(coupon?.percent?1-coupon.percent/100:1);$('checkoutView').innerHTML=`<h2>إتمام الطلب</h2><div class="checkoutGrid"><div><h3>بيانات الشحن</h3><form id="checkoutForm"><input id="coName" required placeholder="الاسم" value="${esc(data?.full_name||'')}"><input id="coPhone" required placeholder="رقم الهاتف" value="${esc(data?.phone||'')}"><input id="coAddress" required placeholder="العنوان بالتفصيل" value="${esc(data?.address||'')}"><input id="coCity" required placeholder="المحافظة / المدينة" value="${esc(data?.city||'')}"><textarea id="coNote" placeholder="ملاحظات للطلب"></textarea><h3>طريقة الدفع</h3><label class="paymentOption"><input type="radio" name="payment" value="card" checked> 💳 بطاقة بنكية (Visa / Mastercard)</label><label class="paymentOption"><input type="radio" name="payment" value="cod"> 💵 الدفع عند الاستلام</label><button class="btn primary fullBtn">تأكيد الطلب</button></form></div><aside class="summary"><h3>ملخص الطلب</h3>${cart.map(p=>`<div><span>${esc(p.name)} × ${p.qty||1}</span><b>${money(p.price*(p.qty||1))} ج</b></div>`).join('')}<hr><div><b>الإجمالي</b><strong>${money(total)} ج</strong></div></aside></div>`;$('checkoutForm').onsubmit=createOrder}
async function createOrder(e){e.preventDefault();if(!sb||!currentUser)return;const total=subtotal()*(coupon?.percent?1-coupon.percent/100:1),payment=document.querySelector('input[name=payment]:checked').value;const payload={user_id:currentUser.id,total,subtotal:subtotal(),discount:subtotal()-total,status:'pending_payment',payment_method:payment,shipping_name:$('coName').value,shipping_phone:$('coPhone').value,shipping_address:$('coAddress').value,shipping_city:$('coCity').value,customer_note:$('coNote').value};const r=await sb.rpc('create_order_secure',{p_order:payload,p_items:cart.map(p=>({product_id:p.id,quantity:p.qty||1,name:p.name})),p_coupon_code:coupon?.code||null});if(r.error){console.error(r.error);toast('تعذر إنشاء الطلب: '+r.error.message);return}const order=r.data?.[0]||r.data;if(payment==='card'){
    if(payCfg.enabled&&payCfg.checkout_endpoint){
      try{
        const resp=await fetch(payCfg.checkout_endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${await getAccessToken()}`},body:JSON.stringify({order_id:order.id})});
        const out=await resp.json().catch(()=>({}));
        if(out.checkout_url){location.href=out.checkout_url;return}
        toast(out.message||'تعذر فتح صفحة الدفع');return;
      }catch(err){toast('تعذر الاتصال ببوابة الدفع');return}
    }
    toast('بوابة الدفع غير مفعلة بعد');return;
  }else{toast('تم استلام طلبك بنجاح والدفع عند الاستلام');}cart=[];saveLocal();updateCart();setTimeout(()=>{closeModal('checkoutModal');showTracking(order.tracking_number||order.order_number)},700)}
async function getAccessToken(){const {data}=await sb.auth.getSession();return data.session?.access_token||''}
async function applyCoupon(){const code=$('couponInput').value.trim().toUpperCase();if(!code||!sb)return;const {data,error}=await sb.from('coupons').select('*').eq('code',code).eq('active',true).maybeSingle();if(error||!data){toast('كود الخصم غير صحيح');return}if(data.expires_at&&new Date(data.expires_at)<new Date()){toast('الكوبون منتهي');return}coupon=data;updateCart();toast(`تم تطبيق خصم ${data.percent}%`)}
function statusText(s){return ({pending_payment:'في انتظار الدفع',paid:'تم الدفع',processing:'قيد التجهيز',shipped:'تم الشحن',out_for_delivery:'خرج للتوصيل',delivered:'تم التسليم',cancelled:'ملغي'})[s]||s||'جديد'}
function statusSteps(status){const steps=['pending_payment','paid','processing','shipped','out_for_delivery','delivered'],i=steps.indexOf(status);return steps.map((s,n)=>`<div class="timelineStep ${n<=i?'done':''} ${s===status?'current':''}"><span>${n+1}</span><b>${statusText(s)}</b></div>`).join('')}
async function trackOrder(e,modal=false){e.preventDefault();const q=modal?$('trackingInputModal').value.trim():$('trackingInput').value.trim();await showTracking(q,modal)}
async function showTracking(q,modal=false){if(!sb){toast('قاعدة البيانات غير متصلة');return}const {data,error}=await sb.from('orders').select('id,order_number,total,status,tracking_number,shipping_city,created_at,estimated_delivery,shipping_events(event_time,status,note,location)').or(`order_number.eq.${q},tracking_number.eq.${q}`).maybeSingle();const box=$(modal?'trackingResultModal':'trackingResult');if(error||!data){box.innerHTML='<div class="empty">مش لاقيين الطلب. راجع رقم الطلب أو رقم التتبع.</div>';if(modal)openModal('trackModal');return}box.innerHTML=`<div class="trackingCard"><div class="trackingHead"><div><small>رقم الطلب</small><b>${esc(data.order_number)}</b></div><div><small>رقم التتبع</small><b>${esc(data.tracking_number||'لم يصدر بعد')}</b></div><div><small>الحالة</small><strong class="status ${esc(data.status)}">${statusText(data.status)}</strong></div></div><div class="timeline">${statusSteps(data.status)}</div><div class="events">${(data.shipping_events||[]).sort((a,b)=>new Date(b.event_time)-new Date(a.event_time)).map(ev=>`<div class="event"><b>${statusText(ev.status)}</b><span>${esc(ev.location||'')} ${ev.note?'• '+esc(ev.note):''}</span><small>${new Date(ev.event_time).toLocaleString('ar-EG')}</small></div>`).join('')}</div>${data.estimated_delivery?`<div class="eta">🚚 موعد التسليم المتوقع: <b>${new Date(data.estimated_delivery).toLocaleDateString('ar-EG')}</b></div>`:''}</div>`;if(modal)openModal('trackModal');else box.scrollIntoView({behavior:'smooth',block:'center'})}
function openTrack(){openModal('trackModal');$('trackingInputModal').focus()}
function subscribe(e){e.preventDefault();const email=$('email').value.trim();if(sb)sb.from('subscribers').upsert({email}).then(()=>toast('تم تسجيل بريدك للعروض'));else toast('تم تسجيل بريدك محليًا');e.target.reset()}
// Admin
async function openAdmin(){if(!currentUser){toast('سجّل الدخول أولًا');openAccount();return}if(!isAdmin){toast('لوحة الإدارة مخصصة لصاحب المتجر');return}openModal('adminModal');adminTab('products')}
function adminTab(tab){document.querySelectorAll('.adminTabs .tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('adminProducts').hidden=tab!=='products';$('adminOrders').hidden=tab!=='orders';$('adminSite').hidden=tab!=='site';if(tab==='products')renderAdmin();if(tab==='orders')renderAdminOrders();if(tab==='site'){ $('heroTitleAdmin').value=siteSettings.hero_title||'';$('heroTextAdmin').value=siteSettings.hero_text||'';$('heroImageAdmin').value=siteSettings.hero_image||''}}
function renderAdmin(){const box=$('adminProducts');box.innerHTML=`<div class="adminToolbar"><button class="btn primary" onclick="showProductForm()">➕ إضافة منتج</button><b>${products.length} منتج</b></div><div class="adminList">${products.map(p=>`<div class="adminRow"><div class="mini">${p.image?`<img src="${esc(p.image)}">`:'🛍️'}</div><div class="adminInfo"><b>${esc(p.name)}</b><span>${money(p.price)} ج • ${esc(p.source)} • مخزون ${p.stock}</span></div><button class="btn" onclick="editProduct(${p.id})">تعديل</button><button class="btn danger" onclick="deleteProduct(${p.id})">حذف</button></div>`).join('')}</div><div id="productEditor"></div>`}
function showProductForm(p=null){$('productEditor').innerHTML=`<form id="productForm" class="editor"><h3>${p?'تعديل':'إضافة'} منتج</h3><div class="formGrid"><label>الاسم<input id="pName" required value="${esc(p?.name||'')}"></label><label>السعر<input id="pPrice" type="number" min="0" required value="${p?.price||''}"></label><label>السعر قبل الخصم<input id="pOld" type="number" min="0" value="${p?.old||''}"></label><label>المخزون<input id="pStock" type="number" min="0" value="${p?.stock??999}"></label><label>القسم<input id="pCat" required value="${esc(p?.cat||'إلكترونيات')}"></label><label>المتجر<input id="pSource" value="${esc(p?.source||'متجر خارجي')}"></label><label class="full">رابط الأفليت<input id="pUrl" type="url" value="${esc(p?.url||'')}"></label><label class="full">رابط الصورة<input id="pImage" type="url" value="${esc(p?.image||'')}"></label><label class="full">رفع صورة من الجهاز<input id="pImageFile" type="file" accept="image/png,image/jpeg,image/webp"></label><label class="full">الوصف<textarea id="pDesc">${esc(p?.description||'')}</textarea></label></div><button class="btn primary">حفظ</button><button type="button" class="btn" onclick="renderAdmin()">إلغاء</button></form>`;$('productForm').onsubmit=e=>saveProduct(e,p?.id)}
async function uploadImage(file,folder='products'){
  if(!sb||!currentUser||!isAdmin||!file)return '';
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)){toast('اختار صورة PNG أو JPG أو WEBP');return ''}
  if(file.size>5*1024*1024){toast('حجم الصورة لازم يكون أقل من 5 ميجابايت');return ''}
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
  const path=`${folder}/${currentUser.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const {error}=await sb.storage.from('product-images').upload(path,file,{upsert:false,contentType:file.type,cacheControl:'31536000'});
  if(error){toast('فشل رفع الصورة: '+error.message);return ''}
  return sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}
async function saveProduct(e,id){
  e.preventDefault();
  if(!sb||!isAdmin)return;
  let image=$('pImage').value.trim();
  const file=$('pImageFile')?.files?.[0];
  if(file){const uploaded=await uploadImage(file,'products');if(uploaded)image=uploaded;else if(!image)return;}
  const payload={name:$('pName').value.trim(),price:+$('pPrice').value,old_price:+$('pOld').value||+$('pPrice').value,stock:+$('pStock').value,category:$('pCat').value.trim(),store:$('pSource').value.trim(),affiliate_url:$('pUrl').value.trim(),image_url:image,description:$('pDesc').value.trim()};
  const r=id?await sb.from('products').update(payload).eq('id',id).select().single():await sb.from('products').insert(payload).select().single();
  if(r.error){toast(r.error.message);return}
  toast(id?'تم تحديث المنتج':'تمت إضافة المنتج');await loadProducts()
}
async function editProduct(id){showProductForm(products.find(p=>p.id===id))}async function deleteProduct(id){if(!confirm('حذف المنتج؟'))return;const r=await sb.from('products').delete().eq('id',id);if(r.error)toast(r.error.message);else{toast('تم حذف المنتج');await loadProducts()}}
async function renderAdminOrders(){const {data,error}=await sb.from('orders').select('id,order_number,total,status,payment_status,payment_method,tracking_number,shipping_city,created_at').order('created_at',{ascending:false});if(error){toast(error.message);return}$('adminOrders').innerHTML=`<div class="adminList">${(data||[]).map(o=>`<div class="adminOrder"><div><b>${esc(o.order_number)}</b><small>${money(o.total)} ج • ${esc(o.shipping_city||'')}</small></div><select onchange="updateOrderStatus('${o.id}',this.value)">${['pending_payment','paid','processing','shipped','out_for_delivery','delivered','cancelled'].map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${statusText(s)}</option>`).join('')}</select><input placeholder="رقم التتبع" value="${esc(o.tracking_number||'')}" onchange="updateTracking('${o.id}',this.value)"><span class="status ${esc(o.status)}">${statusText(o.status)}</span></div>`).join('')||'<div class="empty">مفيش طلبات.</div>'}</div>`}
async function updateOrderStatus(id,status){const payload={status};if(status==='paid')payload.payment_status='paid';const r=await sb.from('orders').update(payload).eq('id',id);if(r.error)toast(r.error.message);else{await sb.from('shipping_events').insert({order_id:id,status,note:'تحديث من لوحة الإدارة'});toast('تم تحديث حالة الطلب')}}
async function updateTracking(id,tracking){const r=await sb.from('orders').update({tracking_number:tracking}).eq('id',id);if(r.error)toast(r.error.message);else toast('تم حفظ رقم التتبع')}
async function saveSiteSettings(){
  if(!sb||!isAdmin)return;
  let heroImage=$('heroImageAdmin').value.trim();
  const file=$('heroImageFile')?.files?.[0];
  if(file){const uploaded=await uploadImage(file,'site');if(uploaded)heroImage=uploaded;else if(!heroImage)return;}
  const payload={hero_title:$('heroTitleAdmin').value,hero_text:$('heroTextAdmin').value,hero_image:heroImage};
  const r=siteSettings.id?await sb.from('site_settings').update(payload).eq('id',siteSettings.id):await sb.from('site_settings').insert(payload).select().single();
  if(r.error)toast(r.error.message);else{siteSettings={...siteSettings,...payload,...(r.data||{})};applySiteImage();toast('تم حفظ الواجهة')}}
function applySiteImage(){if(siteSettings.hero_image){document.querySelector('.hero').style.backgroundImage=`linear-gradient(90deg,#f8f6fbf2,#f8f6fbdd),url("${siteSettings.hero_image}")`}}
init();
