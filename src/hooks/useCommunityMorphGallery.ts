import { useEffect, useRef, useState } from "react";
import { getApprovedMorphImages } from "../services/creatorService";

export type ApprovedMorphImage = { id?: string; morphId?: string; imageUrl: string; creditName?: string; creditSocial?: string; creditMode?: string; approvedAt?: unknown };

export function useCommunityMorphGallery(morphId: string) {
  const [images,setImages]=useState<ApprovedMorphImage[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [selectedImage,setSelectedImage]=useState<ApprovedMorphImage|null>(null);
  const galleryRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    let cancelled=false;
    setLoading(true);
    void getApprovedMorphImages(morphId)
      .then((result)=>{
        if(cancelled)return;
        setImages((result as ApprovedMorphImage[]).filter((image)=>Boolean(image?.imageUrl)));
        setError("");
      })
      .catch((loadError)=>{
        if(cancelled)return;
        setError(loadError instanceof Error?loadError.message:"We couldn't load the community images.");
      })
      .finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[morphId]);

  function move(direction:"left"|"right"){
    galleryRef.current?.scrollBy({left:direction==="right"?320:-320,behavior:"smooth"});
  }

  return {images,loading,error,selectedImage,setSelectedImage,galleryRef,move};
}
