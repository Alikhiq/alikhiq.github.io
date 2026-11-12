import bpy, sys, math
from mathutils import Vector
a=sys.argv[sys.argv.index('--')+1:]; OUT=a[0]; F0=int(a[1]); F1=int(a[2]); RES=int(a[3]); SMP=int(a[4])
R='/home/user/alikhiq.github.io/'
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene; sc.render.engine='CYCLES'; sc.cycles.samples=SMP; sc.cycles.use_denoising=True
sc.cycles.use_adaptive_sampling=True; sc.cycles.max_bounces=4
sc.render.resolution_x=1080; sc.render.resolution_y=1920; sc.render.resolution_percentage=RES
sc.render.fps=30; sc.frame_start=1; sc.frame_end=240
sc.view_settings.view_transform='Filmic' if 'Filmic' in [i.identifier for i in bpy.types.ColorManagedViewSettings.bl_rna.properties['view_transform'].enum_items] else 'AgX'
sc.view_settings.look='None'
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(0.018,0.008,0.022,1); w.node_tree.nodes['Background'].inputs[1].default_value=1.0
def mat(name,col,metal=0,rough=0.5,emis=None,es=1):
    m=bpy.data.materials.new(name); m.use_nodes=True; b=m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=(*col,1); b.inputs['Metallic'].default_value=metal; b.inputs['Roughness'].default_value=rough
    if emis: b.inputs['Emission Color'].default_value=(*emis,1); b.inputs['Emission Strength'].default_value=es
    return m
GOLD=mat('gold',(0.83,0.56,0.30),1,0.22)
# floor: glossy plum
bpy.ops.mesh.primitive_plane_add(size=80,location=(0,0,0)); fl=bpy.context.object; fl.data.materials.append(mat('floor',(0.03,0.012,0.04),0.0,0.12))
# back wall far away to catch gradient
bpy.ops.mesh.primitive_plane_add(size=80,location=(0,22,0),rotation=(math.radians(90),0,0)); bpy.context.object.data.materials.append(mat('wall',(0.05,0.02,0.07),0,0.9))
def photo(path,x,y,z,h,rotz):
    img=bpy.data.images.load(path); ar=img.size[0]/img.size[1]; wd=h*ar
    bpy.ops.mesh.primitive_plane_add(size=1,location=(x,y,z+h/2),rotation=(math.radians(90),0,math.radians(rotz))); p=bpy.context.object; p.scale=(wd,h,1)
    m=bpy.data.materials.new('ph'); m.use_nodes=True; nt=m.node_tree; b=nt.nodes['Principled BSDF']
    t=nt.nodes.new('ShaderNodeTexImage'); t.image=img
    nt.links.new(t.outputs[0],b.inputs['Base Color']); nt.links.new(t.outputs[0],b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value=0.9; b.inputs['Roughness'].default_value=0.35
    p.data.materials.append(m)
    # gold frame behind
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,z+h/2),rotation=(0,0,math.radians(rotz))); f=bpy.context.object; f.scale=(wd+0.12,0.05,h+0.12)
    f.location+=Vector((math.sin(math.radians(rotz))*-0.04, math.cos(math.radians(rotz))*0.04,0)); f.data.materials.append(GOLD)
    bv=f.modifiers.new('b','BEVEL'); bv.width=0.02; bv.segments=3
V=R+'videos/photos/'
photo(V+'susu-photo-classic.jpg',-2.2,2.0,0.25,3.3,-16)
photo(V+'susu-photo-pen.jpg',0.0,4.5,0.25,3.6,0)
photo(V+'susu-photo-side.jpg',2.2,2.0,0.25,3.3,16)
# 3D gold logo from the real SVG
bpy.ops.import_curve.svg(filepath=R+'susu-preview/brand/susu-logo-gold.svg')
cur=[o for o in bpy.data.objects if o.type=='CURVE']
for o in cur:
    o.data.extrude=0.0009; o.data.bevel_depth=0.00012; o.data.bevel_resolution=2; o.data.materials.clear(); o.data.materials.append(GOLD)
bpy.ops.object.select_all(action='DESELECT')
for o in cur: o.select_set(True)
bpy.context.view_layer.objects.active=cur[0]; bpy.ops.object.join(); lg=bpy.context.object
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY',center='BOUNDS')
s=2.6/max(lg.dimensions.x,1e-6); lg.scale=(s,s,s); lg.rotation_euler=(math.radians(90),0,0); lg.location=(0,4.4,4.9)
# lights
def area(loc,rot,size,pw,col):
    bpy.ops.object.light_add(type='AREA',location=loc,rotation=[math.radians(r) for r in rot]); l=bpy.context.object; l.data.size=size; l.data.energy=pw; l.data.color=col; return l
area((0,-1,7),(15,0,0),6,900,(1,0.82,0.62)); area((-6,3,3),(0,-75,0),4,500,(0.75,0.5,1)); area((6,3,3),(0,75,0),4,500,(1,0.7,0.5))
area((0,1.5,6.5),(-35,0,0),3,900,(1,0.85,0.65))
# camera path
bpy.ops.object.camera_add(); cam=bpy.context.object; sc.camera=cam; cam.data.lens=32; cam.data.dof.use_dof=True; cam.data.dof.aperture_fstop=2.0
bpy.ops.object.empty_add(location=(0,2,1.9)); tg=bpy.context.object
c=cam.constraints.new('TRACK_TO'); c.target=tg; c.track_axis='TRACK_NEGATIVE_Z'; c.up_axis='UP_Y'; cam.data.dof.focus_object=tg
K=[(1,(-3.0,-3.0,1.7),(-2.2,2.0,2.0)),(80,(-1.0,-2.4,1.8),(-1.6,2.2,2.0)),(150,(1.4,-2.4,1.9),(2.0,2.2,2.0)),(240,(0,-2.2,2.6),(0,4.5,3.1))]
for f,cl,tl in K:
    cam.location=cl; cam.keyframe_insert('location',frame=f); tg.location=tl; tg.keyframe_insert('location',frame=f)
sc.render.image_settings.file_format='JPEG'; sc.render.image_settings.quality=95
for f in range(F0,F1+1,int(a[5]) if len(a)>5 else 1):
    sc.frame_set(f); sc.render.filepath=f'{OUT}/{f:05d}.jpg'; bpy.ops.render.render(write_still=True)
