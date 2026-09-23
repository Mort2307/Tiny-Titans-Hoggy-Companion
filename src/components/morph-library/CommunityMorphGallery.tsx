import { useNavigate } from "react-router-dom";
import { useCommunityMorphGallery } from "../../hooks/useCommunityMorphGallery";

type Props={morphId:string;morphName:string;};

export default function CommunityMorphGallery({morphId,morphName}:Props){
  const navigate=useNavigate();
  const {images,loading,error,selectedImage,setSelectedImage,galleryRef,move}=useCommunityMorphGallery(morphId);
  return <section className="morph-detail__section morph-community-gallery">
    <div className="morph-community-gallery__header"><div><h3>Community examples</h3><p>Approved reference photographs submitted by Tiny Titans keepers.</p></div>{!loading&&!error&&images.length>0&&<span className="morph-community-gallery__count">{images.length} {images.length===1?"example":"examples"}</span>}</div>
    {loading?<p className="morph-community-gallery__state">Loading approved {morphName} examples…</p>:error?<p className="morph-community-gallery__state" role="alert">{error}</p>:images.length===0?<button type="button" className="morph-community-gallery__state morph-community-gallery__state--clickable" onClick={()=>navigate("/morph-library?submitMorphImage=1&morphId="+encodeURIComponent(morphId))}><strong>No community examples have been approved for {morphName} yet.</strong><span>Be the first to contribute →</span></button>:<div className="morph-community-gallery__viewport"><button type="button" className="morph-community-gallery__nav" onClick={()=>move("left")} aria-label="Previous community image">‹</button><div className="morph-community-gallery__scroller" ref={galleryRef} tabIndex={0}>{images.map((image,index)=><button key={image.id||image.imageUrl+"-"+index} type="button" className="morph-community-gallery__card" onClick={()=>setSelectedImage(image)}><img src={image.imageUrl} alt={morphName+" community example "+(index+1)} loading={index<2?"eager":"lazy"}/>{(image.creditName||image.creditSocial)&&<span className="morph-community-gallery__credit">{image.creditName||image.creditSocial}</span>}</button>)}</div><button type="button" className="morph-community-gallery__nav" onClick={()=>move("right")} aria-label="Next community image">›</button></div>}
    {selectedImage&&<div className="morph-community-gallery__lightbox" role="presentation" onMouseDown={()=>setSelectedImage(null)}><button type="button" className="morph-community-gallery__lightbox-close" onClick={()=>setSelectedImage(null)} aria-label="Close image">×</button><img src={selectedImage.imageUrl} alt={morphName+" community example"} onMouseDown={(event)=>event.stopPropagation()}/>{(selectedImage.creditName||selectedImage.creditSocial)&&<p>Credit: {selectedImage.creditName||selectedImage.creditSocial}</p>}</div>}
  </section>;
}
