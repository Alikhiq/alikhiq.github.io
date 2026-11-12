import bpy, sys, math
from mathutils import Vector
# blender -b -P / python susu_lux.py -- OUT F0 F1 RES% SAMPLES STEP   (frames 1..180 @ 30 fps = 6 s)
a = sys.argv[sys.argv.index('--') + 1:]; OUT = a[0]; F0 = int(a[1]); F1 = int(a[2]); RES = int(a[3]); SMP = int(a[4]); STEP = int(a[5]) if len(a) > 5 else 1
R = '/home/user/alikhiq.github.io/'
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = SMP; sc.cycles.use_denoising = True
sc.cycles.use_adaptive_sampling = True; sc.cycles.max_bounces = 5; sc.cycles.device = 'CPU'
sc.render.use_persistent_data = True; sc.cycles.seed = 7; sc.cycles.use_animated_seed = False; sc.cycles.adaptive_threshold = 0.015
sc.render.resolution_x = 1080; sc.render.resolution_y = 1920; sc.render.resolution_percentage = RES
sc.render.fps = 30; sc.frame_start = 1; sc.frame_end = 150
vt = [i.identifier for i in bpy.types.ColorManagedViewSettings.bl_rna.properties['view_transform'].enum_items]
sc.view_settings.view_transform = 'AgX' if 'AgX' in vt else 'Filmic'
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.012, 0.006, 0.016, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.0

def mat(name, col, metal=0, rough=0.5, spec=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    return m
GOLD = mat('gold', (0.86, 0.60, 0.32), 1, 0.16)
BLACK = mat('floor', (0.006, 0.004, 0.008), 0.0, 0.38)

# polished black stone floor (mirror-like) and a dark back wall
bpy.ops.mesh.primitive_plane_add(size=90, location=(0, 0, 0)); bpy.context.object.data.materials.append(BLACK)
bpy.ops.mesh.primitive_plane_add(size=90, location=(0, 12, 0), rotation=(math.radians(90), 0, 0))
bpy.context.object.data.materials.append(mat('wall', (0.035, 0.016, 0.05), 0, 0.85))

def photo(path, x, y, h, rotz, strength):
    img = bpy.data.images.load(path); ar = img.size[0] / img.size[1]; wd = h * ar
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, y, 0.55 + h / 2), rotation=(math.radians(90), 0, math.radians(rotz)))
    p = bpy.context.object; p.scale = (wd, h, 1)
    m = bpy.data.materials.new('ph'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img
    nt.links.new(t.outputs[0], b.inputs['Base Color']); nt.links.new(t.outputs[0], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = strength; b.inputs['Roughness'].default_value = 0.4
    p.data.materials.append(m)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, 0.55 + h / 2), rotation=(0, 0, math.radians(rotz)))
    f = bpy.context.object; f.scale = (wd + 0.1, 0.045, h + 0.1)
    f.location += Vector((math.sin(math.radians(rotz)) * -0.04, math.cos(math.radians(rotz)) * 0.04, 0)); f.data.materials.append(GOLD)
    bv = f.modifiers.new('b', 'BEVEL'); bv.width = 0.016; bv.segments = 3

M = R + 'susu-preview/media/'
photo(M + 'susu-portrait.webp', -2.5, 7.5, 3.3, -9, 0.55)
photo(M + 'susu-brows.webp', 0.0, 8.6, 3.9, 0, 0.7)
photo(M + 'susu-book-photo.webp', 2.5, 7.5, 3.3, 9, 0.55)

# gold wordmark: exact SVG silhouette (4096 px mask) with a bevelled height map, so no triangulation artefacts
L = R + 'motion/kit/work/logo4k/'
mimg = bpy.data.images.load(L + 'mask.png'); himg = bpy.data.images.load(L + 'height.png'); himg.colorspace_settings.name = 'Non-Color'; mimg.colorspace_settings.name = 'Non-Color'
ar = mimg.size[0] / mimg.size[1]; LW = 3.0
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 7.0, 6.3), rotation=(math.radians(90), 0, 0)); lg = bpy.context.object; lg.scale = (LW, LW / ar, 1)
lm = bpy.data.materials.new('logo'); lm.use_nodes = True; nt = lm.node_tree; nt.nodes.clear()
out = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); bs.inputs['Base Color'].default_value = (0.90, 0.62, 0.32, 1); bs.inputs['Metallic'].default_value = 1; bs.inputs['Roughness'].default_value = 0.2
tm = nt.nodes.new('ShaderNodeTexImage'); tm.image = mimg; th = nt.nodes.new('ShaderNodeTexImage'); th.image = himg
for t in (tm, th): t.interpolation = 'Cubic'; t.extension = 'CLIP'
bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 1.0; bm.inputs['Distance'].default_value = 0.035
nt.links.new(th.outputs['Color'], bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], bs.inputs['Normal'])
nt.links.new(tm.outputs['Color'], mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(bs.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs[0])
lg.data.materials.append(lm)
lg.rotation_euler[2] = math.radians(-10); lg.keyframe_insert('rotation_euler', frame=1)
lg.rotation_euler[2] = math.radians(10); lg.keyframe_insert('rotation_euler', frame=150)

def area(loc, rot, size, pw, col, name):
    bpy.ops.object.light_add(type='AREA', location=loc, rotation=[math.radians(r) for r in rot]); l = bpy.context.object
    l.data.size = size; l.data.energy = pw; l.data.color = col; l.name = name; return l
area((0, -1, 6), (20, 0, 0), 5, 500, (1, 0.85, 0.7), 'fill')
area((-5, 3, 3), (0, -80, 0), 3, 500, (0.7, 0.5, 1), 'rimL')
sweep = area((-6, 2.5, 2.2), (0, -78, 0), 1.2, 3600, (1, 0.82, 0.58), 'sweep')   # moving gold sweep light
sweep.location.x = -6; sweep.keyframe_insert('location', frame=20); sweep.location.x = 6; sweep.keyframe_insert('location', frame=95)
bpy.ops.object.light_add(type='SPOT', location=(0, 4.0, 7.5), rotation=(math.radians(-100), 0, 0)); sp = bpy.context.object
sp.data.energy = 5000; sp.data.spot_size = math.radians(55); sp.data.spot_blend = 1.0; sp.data.color = (0.95, 0.6, 0.85); sp.data.shadow_soft_size = 1.5
area((0, 12, 6), (-70, 0, 0), 9, 260, (1, 0.9, 0.8), 'gallery')   # washes the photo wall

bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam; cam.data.lens = 40
cam.data.dof.use_dof = True; cam.data.dof.aperture_fstop = 1.6
bpy.ops.object.empty_add(location=(0, 7.0, 6.3)); tg = bpy.context.object
c = cam.constraints.new('TRACK_TO'); c.target = tg; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'; cam.data.dof.focus_object = tg
# macro start on the wordmark, long pull-back and rise to reveal the framed photographs
K = [(1, (0.25, -0.2, 6.4), (0, 7.0, 6.3)), (60, (-0.1, 1.7, 6.3), (0, 7.0, 6.25)), (125, (0, -1.5, 4.4), (0, 7.5, 4.8)), (150, (0, -4.0, 4.0), (0, 8.0, 4.4))]
for f, cl, tl in K:
    cam.location = cl; cam.keyframe_insert('location', frame=f); tg.location = tl; tg.keyframe_insert('location', frame=f)
sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 95
import os; os.makedirs(OUT, exist_ok=True)
for f in range(F0, F1 + 1, STEP):
    sc.frame_set(f); sc.render.filepath = f'{OUT}/{f:05d}.jpg'; bpy.ops.render.render(write_still=True)
