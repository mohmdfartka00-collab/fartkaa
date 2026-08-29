const baseProducts=[
{id:1,name:"سماعة لاسلكية",price:1299,old:1599,cat:"إلكترونيات",source:"أمازون",emoji:"🎧",url:"https://www.amazon.eg/"},
{id:2,name:"ساعة ذكية",price:899,old:1099,cat:"إلكترونيات",source:"نون",emoji:"⌚",url:"https://www.noon.com/egypt-ar/"},
{id:3,name:"ماكينة قهوة",price:1499,old:1799,cat:"منزل",source:"نون",emoji:"☕",url:"https://www.noon.com/egypt-ar/"},
{id:4,name:"حذاء رياضي",price:599,old:749,cat:"رياضة",source:"طلبات",emoji:"👟",url:"https://www.talabat.com/egypt"},
{id:5,name:"شنطة أنيقة",price:799,old:999,cat:"أزياء",source:"متجر خارجي",emoji:"👜",url:"#"},
{id:6,name:"لعبة أطفال",price:399,old:499,cat:"أطفال",source:"أمازون",emoji:"🧸",url:"https://www.amazon.eg/"},
{id:7,name:"سماعة رأس",price:999,old:1299,cat:"إلكترونيات",source:"متجر خارجي",emoji:"🎵",url:"#"},
{id:8,name:"مصباح منزلي",price:449,old:599,cat:"منزل",source:"نون",emoji:"💡",url:"https://www.noon.com/egypt-ar/"}
];
const cats=[["الكل","✨"],["إلكترونيات","📱"],["منزل","🏠"],["أزياء","👕"],["أطفال","🧸"],["رياضة","⚽"]];
let products=JSON.parse(localStorage.getItem("fartaka_products")||"null")||baseProducts;
let activeCat="الكل",cart=JSON.parse(localStorage.getItem("fartaka_cart")||"[]");


function escapeHtml(x){return String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function addAffiliateProduct(e){
 e.preventDefault();
 const name=document.getElementById("aName").value.trim(),price=Number(document.getElementById("aPrice").value);
 const cat=document.getElementById("aCat").value,source=document.getElementById("aSource").value,url=document.getElementById("aUrl").value.trim();
 const file=document.getElementById("aImageFile").files[0];
 if(!name||!price||!url){toast("أكمل اسم المنتج والسعر والرابط");return}
 const save=(image)=>{const product={id:Date.now(),name,price,old:price,cat,source,emoji:"🛍️",url,image:image||""};
 products.unshift(product);localStorage.setItem("fartaka_products",JSON.stringify(products));
 e.target.reset();activeCat="الكل";renderProducts();renderEditor();toast("تمت إضافة المنتج إلى متجر فرتكه");
 document.getElementById("products").scrollIntoView({behavior:"smooth"});}
 if(file){const reader=new FileReader();reader.onload=()=>save(reader.result);reader.readAsDataURL(file)}else save("");
}

function renderEditor(){
 const box=document.getElementById("editList"); if(!box)return;
 box.innerHTML=products.map((p,i)=>`<div class="editRow">
 ${p.image?`<img src="${p.image}" alt="">`:`<span>🛍️</span>`}
 <strong>${escapeHtml(p.name)}</strong>
 <input type="file" accept="image/*" onchange="replaceProductImage(${i},this.files[0])">
 <button onclick="deleteProduct(${i})">حذف</button></div>`).join("");
}
function replaceProductImage(i,file){
 if(!file)return; const r=new FileReader(); r.onload=()=>{products[i].image=r.result;localStorage.setItem("fartaka_products",JSON.stringify(products));renderProducts();renderEditor();toast("تم تغيير الصورة");}; r.readAsDataURL(file);
}
function deleteProduct(i){if(confirm("هل تريد حذف المنتج؟")){products.splice(i,1);localStorage.setItem("fartaka_products",JSON.stringify(products));renderProducts();renderEditor();toast("تم حذف المنتج");}}

function init(){
 document.getElementById("categoriesGrid").innerHTML=cats.slice(1).map(c=>`<button class="category" onclick="filterCat('${c[0]}')"><div class="ico">${c[1]}</div><b>${c[0]}</b></button>`).join("");
 document.getElementById("chips").innerHTML=cats.map(c=>`<button class="chip ${c[0]==="الكل"?"active":""}" onclick="filterCat('${c[0]}')">${c[1]} ${c[0]}</button>`).join("");
 renderProducts();updateCart();
}
function renderProducts(){
 let list=activeCat==="الكل"?[...products]:products.filter(p=>p.cat===activeCat);
 const s=document.getElementById("sort").value;
 if(s==="low")list.sort((a,b)=>a.price-b.price);if(s==="high")list.sort((a,b)=>b.price-a.price);
 document.getElementById("productsGrid").innerHTML=list.map(p=>card(p)).join("");
}
function card(p){const visual=p.image?`<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">`:p.emoji;return `<article class="card"><span class="source">${p.source}</span><div class="cardImg">${visual}</div><div class="cardBody"><small>${p.cat}</small><h3>${p.name}</h3><div class="price">${p.price.toLocaleString("ar-EG")} ج <span class="old">${p.old.toLocaleString("ar-EG")} ج</span></div><div class="cardActions"><button class="add" onclick="addToCart(${p.id})">🛒 للسلة</button><button class="buy" onclick="buy(${p.id})">شراء الآن</button></div></div></article>`}
function filterCat(cat){activeCat=cat;document.querySelectorAll(".chip").forEach(x=>x.classList.toggle("active",x.textContent.includes(cat)));renderProducts();document.getElementById("products").scrollIntoView({behavior:"smooth"})}
function addToCart(id){const p=products.find(x=>x.id===id);cart.push(p);localStorage.setItem("fartaka_cart",JSON.stringify(cart));updateCart();toast("تمت إضافة المنتج للسلة");}
function updateCart(){document.getElementById("count").textContent=cart.length;document.getElementById("cartItems").innerHTML=cart.length?cart.map((p,i)=>`<div class="cartRow"><span>${p.emoji} ${p.name}</span><b>${p.price.toLocaleString("ar-EG")} ج <button onclick="removeCart(${i})">×</button></b></div>`).join(""):"<p>السلة فارغة.</p>";document.getElementById("total").textContent=cart.reduce((a,p)=>a+p.price,0).toLocaleString("ar-EG")}
function removeCart(i){cart.splice(i,1);localStorage.setItem("fartaka_cart",JSON.stringify(cart));updateCart()}
function openCart(){document.getElementById("cartDrawer").classList.add("open");document.getElementById("overlay").classList.add("show")}
function closeCart(){document.getElementById("cartDrawer").classList.remove("open");document.getElementById("overlay").classList.remove("show")}
function buy(id){const p=products.find(x=>x.id===id);if(p.url==="#"){toast("أضف رابط الشراء الحقيقي لهذا المنتج من لوحة الإدارة");return}window.open(p.url,"_blank","noopener")}
function openSearch(){document.getElementById("searchModal").classList.add("show");document.getElementById("searchInput").focus()}
function closeSearch(){document.getElementById("searchModal").classList.remove("show")}
function searchProducts(){let q=document.getElementById("searchInput").value.trim();let list=products.filter(p=>(p.name+" "+p.cat+" "+p.source).includes(q));document.getElementById("searchResults").innerHTML=list.map(p=>`<div class="result"><span>${p.emoji} ${p.name}</span><button onclick="closeSearch();document.getElementById('products').scrollIntoView();filterCat('${p.cat}')">عرض</button></div>`).join("")||"<p>مفيش نتائج مطابقة.</p>"}
function importLink(){let u=document.getElementById("productUrl").value.trim();if(!u){toast("الصق رابط المنتج أولاً");return}try{new URL(u)}catch(e){toast("الرابط غير صحيح");return}toast("تم فحص الرابط. الاستيراد التلقائي يحتاج API مصرح به من المتجر.");}
function checkout(){if(!cart.length){toast("السلة فارغة");return}toast("الطلب جاهز. اربط هنا واتساب أو بوابة دفع عند النشر.");}
function subscribe(e){e.preventDefault();toast("تم تسجيل بريدك للعروض التجريبية");e.target.reset()}
function toast(t){let x=document.getElementById("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2800)}
init();

document.addEventListener("DOMContentLoaded",()=>setTimeout(renderEditor,50));
