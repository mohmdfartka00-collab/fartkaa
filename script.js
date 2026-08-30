let sb=null;
const cfg=window.FARTAKA_SUPABASE_CONFIG||{};
if(window.supabase&&cfg.supabase_url&&cfg.supabase_publishable_key){
  sb=window.supabase.createClient(cfg.supabase_url,cfg.supabase_publishable_key);
}
const cats=[["الكل","✨"],["إلكترونيات","📱"],["منزل","🏠"],["أزياء","👕"],["أطفال","🧸"],["رياضة","⚽"]];
let products=[], activeCat="الكل", cart=JSON.parse(localStorage.getItem("fartaka_cart")||"[]"), currentUser=null, isAdmin=false;

function escapeHtml(x){return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function toast(t){const x=document.getElementById("toast");if(!x)return;x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2800)}
async function init(){
  const cg=document.getElementById("categoriesGrid");
  if(cg) cg.innerHTML=cats.slice(1).map(c=>`<button class="category" onclick="filterCat('${c[0]}')"><div class="ico">${c[1]}</div><b>${c[0]}</b></button>`).join("");
  const ch=document.getElementById("chips");
  if(ch) ch.innerHTML=cats.map(c=>`<button class="chip ${c[0]==="الكل"?"active":""}" onclick="filterCat('${c[0]}')">${c[1]} ${c[0]}</button>`).join("");
  document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).hidden=true);
  document.getElementById("cancelEdit")?.addEventListener("click",()=>document.getElementById("adminAddProduct").hidden=true);
  bindAuth();
  if(sb){
    const {data:{session}}=await sb.auth.getSession();
    if(session) await setUser(session.user);
    sb.auth.onAuthStateChange(async (_event,session)=>{await setUser(session?.user||null)});
  }
  await loadProducts();
  updateCart(); renderAccount();
}
async function setUser(user){
  currentUser=user;
  isAdmin=false;
  if(user&&sb){
    const {data}=await sb.from("profiles").select("full_name,role").eq("id",user.id).maybeSingle();
    isAdmin=data?.role==="admin";
  }
  renderAccount();
}
async function loadProducts(){
  if(!sb){toast("تعذر الاتصال بقاعدة البيانات");return}
  const {data,error}=await sb.from("products").select("*").order("created_at",{ascending:false});
  if(error){console.error(error);toast("حصل خطأ في تحميل المنتجات");return}
  products=(data||[]).map(p=>({id:p.id,name:p.name,price:Number(p.price),old:Number(p.old_price||p.price),cat:p.category||"عام",source:p.store||"متجر خارجي",url:p.affiliate_url||"#",description:p.description||"",image:p.image_url||"",emoji:"🛍️"}));
  renderProducts(); if(isAdmin)renderAdmin();
}
function renderProducts(){
  let list=activeCat==="الكل"?[...products]:products.filter(p=>p.cat===activeCat);
  const s=document.getElementById("sort")?.value;if(s==="low")list.sort((a,b)=>a.price-b.price);if(s==="high")list.sort((a,b)=>b.price-a.price);
  const grid=document.getElementById("productsGrid");if(grid)grid.innerHTML=list.map(card).join("");
}
function card(p){
 const visual=p.image?`<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">`:p.emoji||"🛍️";
 const discount=p.old>p.price?Math.round((1-p.price/p.old)*100):0;
 return `<article class="card"><span class="source">${escapeHtml(p.source)}</span><div class="cardImg">${visual}</div><div class="cardBody"><small>${escapeHtml(p.cat)}</small><h3>${escapeHtml(p.name)}</h3>${discount?`<span class="discount">خصم ${discount}%</span>`:""}<div class="price">${Number(p.price).toLocaleString("ar-EG")} ج <span class="old">${Number(p.old||p.price).toLocaleString("ar-EG")} ج</span></div><div class="cardActions"><button class="add" onclick="addToCart(${p.id})">🛒 للسلة</button><button class="buy" onclick="buy(${p.id})">شراء الآن</button></div></div></article>`
}
function filterCat(cat){activeCat=cat;document.querySelectorAll(".chip").forEach(x=>x.classList.toggle("active",x.textContent.includes(cat)));renderProducts();document.getElementById("products")?.scrollIntoView({behavior:"smooth"})}
function addToCart(id){const p=products.find(x=>x.id===id);if(p){cart.push(p);localStorage.setItem("fartaka_cart",JSON.stringify(cart));updateCart();toast("تمت إضافة المنتج للسلة")}}
function updateCart(){const c=document.getElementById("count");if(c)c.textContent=cart.length;const ci=document.getElementById("cartItems");if(ci)ci.innerHTML=cart.length?cart.map((p,i)=>`<div class="cartRow"><span>🛍️ ${escapeHtml(p.name)}</span><b>${Number(p.price).toLocaleString("ar-EG")} ج <button onclick="removeCart(${i})">×</button></b></div>`).join(""):"<p>السلة فارغة.</p>";const t=document.getElementById("total");if(t)t.textContent=cart.reduce((a,p)=>a+Number(p.price),0).toLocaleString("ar-EG")}
function removeCart(i){cart.splice(i,1);localStorage.setItem("fartaka_cart",JSON.stringify(cart));updateCart()}
function openCart(){document.getElementById("cartDrawer")?.classList.add("open");document.getElementById("overlay")?.classList.add("show")}
function closeCart(){document.getElementById("cartDrawer")?.classList.remove("open");document.getElementById("overlay")?.classList.remove("show")}
function buy(id){const p=products.find(x=>x.id===id);if(p?.url&&p.url!=="#")window.open(p.url,"_blank","noopener");else toast("أضف رابط الشراء من لوحة الإدارة")}
function openSearch(){document.getElementById("searchModal")?.classList.add("show");document.getElementById("searchInput")?.focus()}
function closeSearch(){document.getElementById("searchModal")?.classList.remove("show")}
function searchProducts(){const q=document.getElementById("searchInput").value.trim().toLowerCase();const list=products.filter(p=>(p.name+" "+p.cat+" "+p.source).toLowerCase().includes(q));document.getElementById("searchResults").innerHTML=list.map(p=>`<div class="result"><span>🛍️ ${escapeHtml(p.name)}</span><button onclick="closeSearch();filterCat('${escapeHtml(p.cat)}')">عرض</button></div>`).join("")||"<p>مفيش نتائج مطابقة.</p>"}
function importLink(){const u=document.getElementById("productUrl")?.value.trim();if(!u){toast("الصق رابط المنتج أولاً");return}try{new URL(u)}catch(e){toast("الرابط غير صحيح");return}toast("تم فحص الرابط. أضف المنتج من لوحة الإدارة")}
function checkout(){if(!cart.length){toast("السلة فارغة");return}toast("السلة جاهزة للشراء من المتاجر الخارجية")}
function subscribe(e){e.preventDefault();const email=e.target.querySelector("input")?.value;if(email)localStorage.setItem("fartaka_subscriber",email);toast("تم تسجيل بريدك للعروض");e.target.reset()}

function openAuth(){document.getElementById("authModal").hidden=false}
function bindAuth(){
 let register=false;const form=document.getElementById("authForm"),toggle=document.getElementById("toggleAuth");
 toggle.onclick=()=>{register=!register;document.getElementById("authTitle").textContent=register?"إنشاء حساب":"تسجيل الدخول";document.getElementById("authName").style.display=register?"block":"none";toggle.textContent=register?"لدي حساب بالفعل":"إنشاء حساب جديد"};
 form.onsubmit=async e=>{
  e.preventDefault();
  if(!sb){toast("الاتصال بقاعدة البيانات غير جاهز");return}
  const email=document.getElementById("authEmail").value.trim().toLowerCase(),pass=document.getElementById("authPassword").value,name=document.getElementById("authName").value.trim();
  if(pass.length<6){toast("كلمة المرور لازم تكون 6 أحرف على الأقل");return}
  let result;
  if(register) result=await sb.auth.signUp({email,password:pass,options:{data:{full_name:name}}});
  else result=await sb.auth.signInWithPassword({email,password:pass});
  if(result.error){toast(result.error.message);return}
  if(register){
    if(result.data.user && result.data.session){
      await sb.from("profiles").upsert({id:result.data.user.id,full_name:name,phone:""});
      await setUser(result.data.user);
      toast("تم إنشاء الحساب");
    }else toast("تم إنشاء الحساب. راجع بريدك لتأكيد الحساب ثم سجّل الدخول.");
  }else toast("تم تسجيل الدخول");
  document.getElementById("authModal").hidden=true;
 }
}
function renderAccount(){
 const a=document.getElementById("accountBtn"); if(a)a.title=currentUser?`حساب ${currentUser.email}`:"تسجيل الدخول";
 const admin=document.getElementById("adminBtn");if(admin)admin.hidden=!isAdmin;
}

async function openAdmin(){
 if(!currentUser){toast("سجّل الدخول أولًا");openAuth();return}
 if(!isAdmin){toast("لوحة الإدارة مخصصة لصاحب المتجر");return}
 document.getElementById("adminModal").hidden=false;renderAdmin()
}
function renderAdmin(){
 const box=document.getElementById("adminProducts"),add=document.getElementById("adminAddProduct");if(!box)return;
 box.innerHTML=`<div class="adminToolbar"><button class="btn primary" onclick="showProductForm()">➕ إضافة منتج</button><b>عدد المنتجات: ${products.length}</b></div><div class="adminList">${products.map(p=>`<div class="adminRow"><div class="mini">${p.image?`<img src="${escapeHtml(p.image)}">`:"🛍️"}</div><div class="adminInfo"><b>${escapeHtml(p.name)}</b><span>${Number(p.price).toLocaleString("ar-EG")} ج • ${escapeHtml(p.source)}</span></div><button class="btn" onclick="editProduct(${p.id})">تعديل</button><button class="btn danger" onclick="deleteProduct(${p.id})">حذف</button></div>`).join("")}</div>`;
 if(add)add.hidden=true;
}
function showProductForm(p=null){
 const a=document.getElementById("adminAddProduct");a.hidden=false;
 document.getElementById("editId").value=p?.id||"";
 document.getElementById("pName").value=p?.name||"";document.getElementById("pPrice").value=p?.price||"";
 document.getElementById("pOld").value=p?.old||"";document.getElementById("pCat").value=p?.cat||"إلكترونيات";
 document.getElementById("pSource").value=p?.source||"أمازون";document.getElementById("pUrl").value=p?.url||"";
 document.getElementById("pDesc").value=p?.description||"";document.getElementById("pImage").value="";
}
function editProduct(id){showProductForm(products.find(p=>p.id===id))}
async function deleteProduct(id){
 if(!confirm("حذف المنتج؟"))return;
 const {error}=await sb.from("products").delete().eq("id",id);
 if(error){toast("تعذر حذف المنتج");return}
 products=products.filter(p=>p.id!==id);renderProducts();renderAdmin();toast("تم حذف المنتج")
}
async function uploadImage(file,userId){
 const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
 const path=`${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext||"jpg"}`;
 const {error}=await sb.storage.from("product-images").upload(path,file,{upsert:false,contentType:file.type});
 if(error)throw error;
 const {data}=sb.storage.from("product-images").getPublicUrl(path);
 return data.publicUrl;
}
document.getElementById("productForm")?.addEventListener("submit",async e=>{
 e.preventDefault();
 if(!isAdmin||!currentUser){toast("غير مصرح");return}
 const id=Number(document.getElementById("editId").value)||null,old=products.find(p=>p.id===id),file=document.getElementById("pImage").files[0];
 const payload={name:document.getElementById("pName").value.trim(),price:Number(document.getElementById("pPrice").value),old_price:Number(document.getElementById("pOld").value)||Number(document.getElementById("pPrice").value),category:document.getElementById("pCat").value.trim(),store:document.getElementById("pSource").value,affiliate_url:document.getElementById("pUrl").value.trim(),description:document.getElementById("pDesc").value.trim()};
 try{
  if(file)payload.image_url=await uploadImage(file,currentUser.id);
  if(id){
   const {data,error}=await sb.from("products").update(payload).eq("id",id).select().single();if(error)throw error;
   products=products.map(p=>p.id===id?{...p,id:data.id,name:data.name,price:Number(data.price),old:Number(data.old_price||data.price),cat:data.category||"عام",source:data.store||"متجر خارجي",url:data.affiliate_url||"#",description:data.description||"",image:data.image_url||p.image}:p)
  }else{
   const {data,error}=await sb.from("products").insert(payload).select().single();if(error)throw error;
   products.unshift({id:data.id,name:data.name,price:Number(data.price),old:Number(data.old_price||data.price),cat:data.category||"عام",source:data.store||"متجر خارجي",url:data.affiliate_url||"#",description:data.description||"",image:data.image_url||"",emoji:"🛍️"})
  }
  renderProducts();renderAdmin();e.target.reset();document.getElementById("adminAddProduct").hidden=true;toast(id?"تم تحديث المنتج":"تمت إضافة المنتج")
 }catch(err){console.error(err);toast("تعذر حفظ المنتج: "+(err.message||"خطأ"))}
});
init();
