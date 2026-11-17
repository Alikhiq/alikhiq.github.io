# Mo Tint 3D wordmark: macro close-ups -> reveal. Obsidian black glass letters + dark chrome gold bolt,
# lit as a white studio (off-white set). Transparent film + shadow catcher; composite over paper #F2EFE5.
# blender -b -P logo_macro.py -- wordmark-3d.svg outdir N RX RY SAMPLES [frame,list]
import bpy, math, sys
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index('--') + 1:]
svg, out = a[0], a[1]; N = int(a[2]); RX = int(a[3]); RY = int(a[4]); SAMP = int(a[5]); FRAMES = a[6] if len(a) > 6 else ''
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.import_curve.svg(filepath=svg)
curves = [o for o in sc.objects if o.type == 'CURVE']

def mat(name, base, metal, rough, coat=0.0, spec=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = base; b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.015; b.inputs['Specular IOR Level'].default_value = spec
    return m
GOLD = mat('darkchromegold', (0.84, 0.57, 0.14, 1), 1.0, 0.09)
OBS = mat('obsidian', (0.003, 0.003, 0.004, 1), 0.0, 0.02, coat=1.0, spec=0.8)

def pts(c):
    for s_ in c.data.splines:
        for p in (s_.bezier_points if s_.type == 'BEZIER' else s_.points): yield c.matrix_world @ Vector(p.co[:3])
P = [p for c in curves for p in pts(c)]
minx, maxx = min(p.x for p in P), max(p.x for p in P); W = maxx - minx
miny, maxy = min(p.y for p in P), max(p.y for p in P)
meshes = []
for c in curves:
    c.data.dimensions = '2D'; c.data.fill_mode = 'BOTH'
    c.data.extrude = W * 0.022; c.data.bevel_depth = W * 0.0052; c.data.bevel_resolution = 6
    c.data.resolution_u = 24
    c.data.materials.clear(); c.data.materials.append(GOLD if c.name.lower().startswith('gold') else OBS)
    bpy.ops.object.select_all(action='DESELECT'); c.select_set(True); bpy.context.view_layer.objects.active = c
    bpy.ops.object.convert(target='MESH'); meshes.append(bpy.context.view_layer.objects.active)
bpy.ops.object.select_all(action='DESELECT')
for m in meshes: m.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]; bpy.ops.object.join()
o = bpy.context.view_layer.objects.active
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
org = o.location.copy(); s = 3.0 / max(o.dimensions)
o.location = (0, 0, 0); o.scale = (s, s, s); o.rotation_euler = (math.radians(90), 0, 0)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='MATERIAL'); bpy.ops.object.mode_set(mode='OBJECT')
gcol = bpy.data.collections.new('goldonly'); sc.collection.children.link(gcol)
for ob in [x for x in sc.objects if x.type == 'MESH' and x.data.materials and x.data.materials[0].name.startswith('darkchromegold')]: gcol.objects.link(ob)
yf = -(W * 0.022 + W * 0.0052) * s          # front face plane (camera side is -y)
yb = -yf                                     # back face plane
# SVG viewBox (800 x 288, y down) -> world on the front face, using the artwork bounds
def sv(x, y, depth=0.0):
    cx = minx + x / 800 * W; cy = maxy - y / 288 * (maxy - miny)
    return Vector(((cx - org.x) * s, yf - depth, (cy - org.y) * s))

def ease(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def outq(x): x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 4
def look(eye, tgt, up=Vector((0, 0, 1))):
    f = (tgt - eye).normalized(); r = f.cross(up).normalized(); u = r.cross(f)
    return Matrix((r, u, -f)).transposed().to_quaternion()

# ---- studio: bright warm-white world with a darker floor half (gives the chrome its horizon line)
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; nt = w.node_tree; nt.nodes.clear()
tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); ramp = nt.nodes.new('ShaderNodeValToRGB')
bg = nt.nodes.new('ShaderNodeBackground'); wo = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(tc.outputs['Generated'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], ramp.inputs['Fac'])
el = ramp.color_ramp.elements; el[0].position = 0.58; el[0].color = (0.06, 0.058, 0.055, 1); el[1].position = 0.64; el[1].color = (1.0, 0.97, 0.92, 1)
nt.links.new(ramp.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 1.0; nt.links.new(bg.outputs[0], wo.inputs[0])

def strip(name, loc, rot, size, strength, col=(1, 0.97, 0.92)):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    p = bpy.context.active_object; p.name = name; p.scale = size
    m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; t.nodes.clear()
    e = t.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = strength; e.inputs['Color'].default_value = (*col, 1)
    on = t.nodes.new('ShaderNodeOutputMaterial'); t.links.new(e.outputs[0], on.inputs[0]); p.data.materials.append(m)
    p.visible_camera = False; p.visible_shadow = False; return p
strip('top', (0, -1.6, 3.0), (math.radians(28), 0, 0), (10, 0.5, 1), 10)
strip('left', (-4.0, -2.0, 0.8), (0, math.radians(-65), 0), (0.35, 5, 1), 6, (1, 0.9, 0.75))
strip('right', (4.2, -1.6, 0.4), (0, math.radians(65), 0), (0.3, 5, 1), 5, (0.92, 0.95, 1))
gfill = strip('goldfill', (0, -9, 1.2), (math.radians(90), 0, 0), (14, 5, 1), 0.9, (1, 0.96, 0.88)); gfill.light_linking.receiver_collection = gcol
sweep = strip('sweep', (0, -2.4, 0), (math.radians(90), 0, math.radians(22)), (0.18, 8, 1), 60)
key = bpy.data.lights.new('key', 'AREA'); key.energy = 700; key.size = 6
ko = bpy.data.objects.new('key', key); sc.collection.objects.link(ko); ko.location = (-1.4, -5.5, 2.6)
ko.rotation_euler = (ko.location - Vector((0, 0, 0))).to_track_quat('Z', 'Y').to_euler()
ko.visible_glossy = False
# shadow catcher wall just behind the logo: soft contact shadow on the off-white set
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, yb + 0.09, 0), rotation=(math.radians(90), 0, 0))
wall = bpy.context.active_object; wall.name = 'wall'; wall.is_shadow_catcher = True

# ---- camera: three shots, hard cuts (every frame keyed)
cam = bpy.data.cameras.new('c'); co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co; co.rotation_mode = 'QUATERNION'
cam.dof.use_dof = True
A1, A2 = int(N * 0.30), int(N * 0.58)  # cut frames
for f in range(1, N + 1):
    if f <= A1:   # A: macro along the gold bolt, light runs down its bevel
        k = (f - 1) / (A1 - 1)
        tgt = sv(612, 238).lerp(sv(560, 178), ease(k)); eye = tgt + Vector((0.55, -0.72, 0.38)) + Vector((-0.12, 0.0, 0.04)) * k
        lens, fst = 100, 2.0; sx = 1.6 - 3.2 * ease((k - 0.15) / 0.7)
    elif f <= A2:  # B: glancing macro across the obsidian M O, a glint slides over the glass
        k = (f - A1 - 1) / (A2 - A1 - 1)
        tgt = sv(70, 120).lerp(sv(240, 120), ease(k)); eye = tgt + Vector((-0.6, -0.78, 0.46))
        lens, fst = 85, 2.4; sx = -2.4 + 4.8 * ease((k - 0.1) / 0.75)
    else:          # C: from the N/bolt crossing, pull back to the full mark, straight-on
        k = (f - A2 - 1) / (N - A2 - 1); m = outq(k / 0.78)
        t0 = sv(528, 150); e0 = t0 + Vector((0.36, -0.95, 0.16)); e1 = Vector((0, yf - 8.6, 0.0))
        tgt = t0.lerp(Vector((0, 0, 0)), m); eye = e0.lerp(e1, m)
        lens, fst = 60 - 10 * m, 2.6 + 20 * ease((k - 0.25) / 0.5); sx = -4.5 + 9 * ease((k - 0.55) / 0.4)
    co.location = eye; co.rotation_quaternion = look(eye, tgt); co.keyframe_insert('location', frame=f); co.keyframe_insert('rotation_quaternion', frame=f)
    cam.lens = lens; cam.keyframe_insert('lens', frame=f)
    cam.dof.focus_distance = (tgt - eye).length; cam.dof.keyframe_insert('focus_distance', frame=f)
    cam.dof.aperture_fstop = fst; cam.dof.keyframe_insert('aperture_fstop', frame=f)
    sweep.location = (sx, -2.4, 0.2); sweep.keyframe_insert('location', frame=f)
for fc in (co.animation_data.action.fcurves if co.animation_data else []):
    for kp in fc.keyframe_points: kp.interpolation = 'CONSTANT'

sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMP; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 8; sc.cycles.glossy_bounces = 6
sc.render.film_transparent = True; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.render.resolution_x = RX; sc.render.resolution_y = RY; sc.render.fps = 30
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - High Contrast'
sc.frame_start, sc.frame_end = 1, N
if FRAMES:
    for f in [int(x) for x in FRAMES.split(',')]:
        sc.frame_set(f); sc.render.filepath = f'{out}/{f:04d}.png'; bpy.ops.render.render(write_still=True)
else:
    sc.render.filepath = out + '/'; bpy.ops.render.render(animation=True)
