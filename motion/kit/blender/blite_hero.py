import bpy, sys, math, os
from mathutils import Vector
# python3 blite_hero.py -- OUT F0 F1 RES% SAMPLES STEP    (frames 1..150 @ 30 fps = 5 s)
# Needs work/blite/n4/{8579,8584,8602}-mockup.webp (approved nov4 images from blite.app/media/new/nov4) and wm-mask.png / wm-height.png (the site wordmark, rasterised).
a = sys.argv[sys.argv.index('--') + 1:]; OUT = a[0]; F0 = int(a[1]); F1 = int(a[2]); RES = int(a[3]); SMP = int(a[4]); STEP = int(a[5]) if len(a) > 5 else 1
K_ = '/home/user/alikhiq.github.io/motion/kit/work/blite/'
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = SMP; sc.cycles.use_denoising = True
sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.015; sc.cycles.max_bounces = 5; sc.cycles.device = 'CPU'
sc.render.use_persistent_data = True; sc.cycles.seed = 7; sc.cycles.use_animated_seed = False; sc.cycles.denoiser = 'OPENIMAGEDENOISE'
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
# smoked-oak fluted wall: tight half-round flutes with a procedural grain, warm LED lines in a few grooves
def oak():
    m = bpy.data.materials.new('oak'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (6, 6, 0.6)
    wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Z'; wv.inputs['Scale'].default_value = 2.5; wv.inputs['Distortion'].default_value = 9; wv.inputs['Detail'].default_value = 6
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 40; nz.inputs['Detail'].default_value = 8
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'FLOAT'; mx.inputs['Factor'].default_value = 0.35
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = (0.010, 0.0075, 0.006, 1); cr.color_ramp.elements[1].color = (0.040, 0.026, 0.018, 1)
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.25; bp.inputs['Distance'].default_value = 0.002
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], wv.inputs['Vector']); nt.links.new(mp.outputs['Vector'], nz.inputs['Vector'])
    nt.links.new(wv.outputs['Fac'], mx.inputs['A']); nt.links.new(nz.outputs['Fac'], mx.inputs['B'])
    nt.links.new(mx.outputs['Result'], cr.inputs['Fac']); nt.links.new(cr.outputs['Color'], b.inputs['Base Color'])
    nt.links.new(mx.outputs['Result'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.42; b.inputs['Coat Weight'].default_value = 0.25; b.inputs['Coat Roughness'].default_value = 0.2
    return m
OAK = oak()
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 3.25, 0), rotation=(math.radians(90), 0, 0)); bpy.context.object.data.materials.append(OAK)
LED = bpy.data.materials.new('led'); LED.use_nodes = True; lb = LED.node_tree.nodes['Principled BSDF']
lb.inputs['Base Color'].default_value = (1, 0.75, 0.5, 1); lb.inputs['Emission Color'].default_value = (1, 0.68, 0.42, 1); lb.inputs['Emission Strength'].default_value = 6
FW = 0.12   # flute width
for i in range(-40, 41):
    x = i * FW
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=FW / 2 * 0.96, depth=7.2, location=(x, 3.22, 3.6)); f = bpy.context.object
    f.data.materials.append(OAK); bpy.ops.object.shade_smooth()
    if i % 9 == 4 and abs(x) > 1.3:   # warm LED line set into the groove, away from the wordmark
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x + FW / 2, 3.17, 3.6)); l = bpy.context.object; l.scale = (0.008, 0.008, 7.2); l.data.materials.append(LED)
# warm cove light along the ceiling line
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 3.0, 7.15)); c = bpy.context.object; c.scale = (12, 0.02, 0.01); c.data.materials.append(LED)

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
cw = panel(K_ + 'n4/8579-mockup.webp', 0, 0)
panel(K_ + 'n4/8584-mockup.webp', -(cw / 2 + 0.98), 28)
panel(K_ + 'n4/8602-mockup.webp', (cw / 2 + 0.98), -28)
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
hm = bpy.data.materials.new('halo'); hm.use_nodes = True; nt = hm.node_tree; nt.nodes.clear()
ho = nt.nodes.new('ShaderNodeOutputMaterial'); hmix = nt.nodes.new('ShaderNodeMixShader'); htr = nt.nodes.new('ShaderNodeBsdfTransparent'); hem = nt.nodes.new('ShaderNodeEmission')
hem.inputs['Color'].default_value = (1, 0.7, 0.45, 1); hem.inputs['Strength'].default_value = 3.0
ht = nt.nodes.new('ShaderNodeTexImage'); ht.image = bpy.data.images.load(K_ + 'wm-halo.png'); ht.image.colorspace_settings.name = 'Non-Color'; ht.extension = 'CLIP'
nt.links.new(ht.outputs['Color'], hmix.inputs[0]); nt.links.new(htr.outputs[0], hmix.inputs[1]); nt.links.new(hem.outputs[0], hmix.inputs[2]); nt.links.new(hmix.outputs[0], ho.inputs[0])
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 3.16, 3.55), rotation=(math.radians(90), 0, 0)); hp = bpy.context.object; hp.scale = (LW * 1.08, LW * 1.08 / ar * 1.5, 1); hp.data.materials.append(hm)
hp.visible_shadow = False
lg.location.y = 3.0   # letters stand off the wall so the halo spills around them

def area(loc, rot, size, pw, col):
    bpy.ops.object.light_add(type='AREA', location=loc, rotation=[math.radians(r) for r in rot]); l = bpy.context.object
    l.data.size = size; l.data.energy = pw; l.data.color = col; return l
def spot(loc, rot, pw, ang, col):
    bpy.ops.object.light_add(type='SPOT', location=loc, rotation=[math.radians(r) for r in rot]); l = bpy.context.object
    l.data.energy = pw; l.data.spot_size = math.radians(ang); l.data.spot_blend = 0.9; l.data.color = col; l.data.shadow_soft_size = 0.25; return l
spot((0, 1.0, 5.6), (-12, 0, 0), 1100, 26, (1, 0.84, 0.66))          # wordmark wash from above
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
