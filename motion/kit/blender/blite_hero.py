import bpy, sys, math, os
from mathutils import Vector
# python3 blite_hero.py -- OUT F0 F1 RES% SAMPLES STEP    (frames 1..150 @ 30 fps = 5 s)
# Needs work/blite/{F01,F12,F17}.webp (blite.app lookbook) and wm-mask.png / wm-height.png (the site wordmark, rasterised).
a = sys.argv[sys.argv.index('--') + 1:]; OUT = a[0]; F0 = int(a[1]); F1 = int(a[2]); RES = int(a[3]); SMP = int(a[4]); STEP = int(a[5]) if len(a) > 5 else 1
K_ = '/home/user/alikhiq.github.io/motion/kit/work/blite/'
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = SMP; sc.cycles.use_denoising = True
sc.cycles.use_adaptive_sampling = True; sc.cycles.max_bounces = 6; sc.cycles.device = 'CPU'
sc.render.resolution_x = 1080; sc.render.resolution_y = 1920; sc.render.resolution_percentage = RES
sc.render.fps = 30; sc.frame_start = 1; sc.frame_end = 150
vt = [i.identifier for i in bpy.types.ColorManagedViewSettings.bl_rna.properties['view_transform'].enum_items]
sc.view_settings.view_transform = 'AgX' if 'AgX' in vt else 'Filmic'
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.006, 0.006, 0.007, 1)

def mat(name, col, metal=0, rough=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    return m
BRASS = mat('brass', (0.80, 0.62, 0.38), 1, 0.24)
WALNUT = mat('floor', (0.035, 0.02, 0.014), 0, 0.16)
WALL = mat('wall', (0.005, 0.005, 0.006), 0, 0.6)

bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0)); bpy.context.object.data.materials.append(WALNUT)
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 3.2, 0), rotation=(math.radians(90), 0, 0)); bpy.context.object.data.materials.append(WALL)
# vertical wall panelling (slim fluted strips catch the light)
for i in range(-14, 15):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(i * 0.42, 3.17, 3.0)); s = bpy.context.object; s.scale = (0.025, 0.03, 6); s.data.materials.append(WALL)

def panel(path, x, rotz, h=2.55):
    img = bpy.data.images.load(path); ar = img.size[0] / img.size[1]; wd = h * ar
    r = math.radians(rotz); off = Vector((math.sin(r) * 0.0, 0, 0))
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, 1.6, 0.3 + h / 2), rotation=(math.radians(90), 0, r)); p = bpy.context.object; p.scale = (wd, h, 1)
    m = bpy.data.materials.new('ph'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img
    nt.links.new(t.outputs[0], b.inputs['Base Color']); nt.links.new(t.outputs[0], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = 0.85; b.inputs['Roughness'].default_value = 0.08   # glassy, like a mirror pane
    p.data.materials.append(m)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, 1.6, 0.3 + h / 2), rotation=(0, 0, r)); f = bpy.context.object
    f.scale = (wd + 0.09, 0.05, h + 0.09); f.location += Vector((-math.sin(r) * 0.03, math.cos(r) * 0.03, 0)); f.data.materials.append(BRASS)
    bv = f.modifiers.new('b', 'BEVEL'); bv.width = 0.014; bv.segments = 3
    return wd
# three-way tailor's mirror: centre pane square to camera, wings angled in
cw = panel(K_ + 'F01.webp', 0, 0)
panel(K_ + 'F12.webp', -(cw / 2 + 0.98), 28)
panel(K_ + 'F17.webp', (cw / 2 + 0.98), -28)
# BLITE wordmark: exact site silhouette, ivory satin metal, bevelled by a height map
mimg = bpy.data.images.load(K_ + 'wm-mask.png'); himg = bpy.data.images.load(K_ + 'wm-height.png')
for im in (mimg, himg): im.colorspace_settings.name = 'Non-Color'
ar = mimg.size[0] / mimg.size[1]; LW = 2.4
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 2.9, 3.55), rotation=(math.radians(90), 0, 0)); lg = bpy.context.object; lg.scale = (LW, LW / ar, 1)
lm = bpy.data.materials.new('logo'); lm.use_nodes = True; nt = lm.node_tree; nt.nodes.clear()
out = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); bs.inputs['Base Color'].default_value = (0.93, 0.90, 0.85, 1); bs.inputs['Metallic'].default_value = 1; bs.inputs['Roughness'].default_value = 0.26
tm = nt.nodes.new('ShaderNodeTexImage'); tm.image = mimg; th = nt.nodes.new('ShaderNodeTexImage'); th.image = himg
for t in (tm, th): t.interpolation = 'Cubic'; t.extension = 'CLIP'
bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 1.0; bm.inputs['Distance'].default_value = 0.03
nt.links.new(th.outputs['Color'], bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], bs.inputs['Normal'])
nt.links.new(tm.outputs['Color'], mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(bs.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs[0])
lg.data.materials.append(lm)

def area(loc, rot, size, pw, col):
    bpy.ops.object.light_add(type='AREA', location=loc, rotation=[math.radians(r) for r in rot]); l = bpy.context.object
    l.data.size = size; l.data.energy = pw; l.data.color = col; return l
def spot(loc, rot, pw, ang, col):
    bpy.ops.object.light_add(type='SPOT', location=loc, rotation=[math.radians(r) for r in rot]); l = bpy.context.object
    l.data.energy = pw; l.data.spot_size = math.radians(ang); l.data.spot_blend = 0.9; l.data.color = col; l.data.shadow_soft_size = 0.25; return l
spot((0, 1.0, 5.6), (-12, 0, 0), 1500, 26, (1, 0.84, 0.66))          # wordmark wash from above
spot((0, -0.6, 4.4), (20, 0, 0), 2200, 34, (1, 0.86, 0.7))           # podium pool
spot((-3.2, 0.2, 4.2), (25, -30, 0), 900, 30, (1, 0.8, 0.6)); spot((3.2, 0.2, 4.2), (25, 30, 0), 900, 30, (1, 0.8, 0.6))
sw = area((-4, -1.0, 3.6), (0, -70, 0), 0.8, 1500, (1, 0.85, 0.65))  # travelling rim sweep across the brass
sw.location.x = -4; sw.keyframe_insert('location', frame=10); sw.location.x = 4; sw.keyframe_insert('location', frame=110)
area((0, -5, 3), (80, 0, 0), 6, 50, (0.85, 0.88, 1))                 # faint cool fill

bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam; cam.data.lens = 35
cam.data.dof.use_dof = True; cam.data.dof.aperture_fstop = 2.2
bpy.ops.object.empty_add(location=(0, 2.9, 3.55)); tg = bpy.context.object
c = cam.constraints.new('TRACK_TO'); c.target = tg; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'; cam.data.dof.focus_object = tg
# open on the wordmark, crane down and push back to reveal the three-way mirror and podium
K = [(1, (0.35, -1.6, 3.7), (0, 2.9, 3.55)), (55, (-0.15, -2.4, 3.3), (0, 2.6, 3.0)), (110, (0.2, -5.2, 2.2), (0, 1.6, 1.9)), (150, (0, -6.4, 2.0), (0, 1.6, 2.1))]
for f, cl, tl in K:
    cam.location = cl; cam.keyframe_insert('location', frame=f); tg.location = tl; tg.keyframe_insert('location', frame=f)
sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 95
os.makedirs(OUT, exist_ok=True)
for f in range(F0, F1 + 1, STEP):
    sc.frame_set(f); sc.render.filepath = f'{OUT}/{f:05d}.jpg'; bpy.ops.render.render(write_still=True)
