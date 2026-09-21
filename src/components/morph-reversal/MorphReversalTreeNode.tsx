import type { ReverseTreeNode } from "../../utils/geneticsReversal";
function MorphReversalTreeNode({node,depth=0}:{node:ReverseTreeNode;depth?:number}){
  return <div className="morph-reversal-tree-node" style={{marginLeft:`${depth*16}px`}}><div className="morph-reversal-tree-line"><span className="morph-reversal-tree-marker" aria-hidden="true">{node.children.length?"▾":"•"}</span><strong>{node.name}</strong><span className="morph-reversal-tree-copy">×{node.copies}</span></div>{node.children.map((child)=><MorphReversalTreeNode key={`${child.id}-${child.copies}-${depth}`} node={child} depth={depth+1}/>)}</div>;
}
export default MorphReversalTreeNode;