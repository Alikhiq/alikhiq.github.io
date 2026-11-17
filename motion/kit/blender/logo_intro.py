import bpy, math, sys, mathutils
from mathutils import Vector, Quaternion, Matrix
a = sys.argv[sys.argv.index('--') + 1:]
svg, car, out = a[0], a[1], a[2]; N = int(a[3]); RX = int(a[4]); RY = int(a[5]); SAMP = int(a[6]); FRAMES = a[7] if len(a) > 7 else ''
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.import_curve.svg(filepath=svg)
curves = [o for o in sc.objects if o.type == 'CURVE']

def mat(name, base, metal, rough, coat=0.0, spec=0.5, bump=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = base; b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.02; b.inputs['Specular IOR Level'].default_value = spec
    if bump:  # fine brushed micro-texture so the chrome "road" streaks at speed
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (900, 900, 60)
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.0; nz.inputs['Detail'].default_value = 6
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = 0.002
        nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], nz.inputs['Vector'])
        nt.links.new(nz.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m
GOLD = mat('darkchromegold', (0.80, 0.52, 0.12, 1), 1.0, 0.14, bump=0.12)
OBS = mat('obsidian', (0.004, 0.004, 0.005, 1), 0.0, 0.03, coat=1.0, spec=0.9)

def pts(c):
    for s in c.data.splines:
        for p in (s.bezier_points if s.type == 'BEZIER' else s.points): yield c.matrix_world @ Vector(p.co[:3])
P = [p for c in curves for p in pts(c)]
minx, maxx = min(p.x for p in P), max(p.x for p in P); W = maxx - minx
G = [p for c in curves if c.name.lower().startswith('gold') for p in pts(c)]
gminx, gmaxx, gminy, gmaxy = min(p.x for p in G), max(p.x for p in G), min(p.y for p in G), max(p.y for p in G)
meshes = []
for c in curves:
    c.data.dimensions = '2D'; c.data.fill_mode = 'BOTH'
    c.data.extrude = W * 0.022; c.data.bevel_depth = W * 0.0052; c.data.bevel_resolution = 4
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
bpy.ops.object.shade_smooth()
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='MATERIAL'); bpy.ops.object.mode_set(mode='OBJECT')
GOLD_OBJS = [ob for ob in sc.objects if ob.type == 'MESH' and ob.data.materials and ob.data.materials[0].name.startswith('darkchromegold')]
gcol = bpy.data.collections.new('goldonly'); sc.collection.children.link(gcol)
for ob in GOLD_OBJS: gcol.objects.link(ob)
# map a point of the SVG (curve-space x, y) to world: x' = (x-org.x)*s, z' = (y-org.y)*s ; front face at y = -extrude*s
def w(px, py): return Vector(((px - org.x) * s, 0, (py - org.y) * s))
yf = -(W * 0.022 + W * 0.0052) * s
# gold bolt in SVG units (viewBox 800x288, y down) -> curve space via the gold bbox (polygon bbox x 515.9..665.5, y 62.7..270.5)
SX0, SX1, SY0, SY1 = 515.9, 665.5, 62.7, 270.5
def svg2w(x, y):
    cx = gminx + (x - SX0) / (SX1 - SX0) * (gmaxx - gminx); cy = gmaxy - (y - SY0) / (SY1 - SY0) * (gmaxy - gminy)
    v = w(cx, cy); v.y = yf; return v
A = svg2w(648, 258); B = svg2w(540, 176)   # road: wedge tip -> wide end of the gold stroke
d = (B - A).normalized(); UP = Vector((0, -1, 0))   # the face is the "ground"; up points out of the face
q = d.cross(UP).normalized()
v = (-d * 0.62 + q * 0.78).normalized()           # 3/4 front chase angle
if v.cross(UP).dot(d) > 0: q = -q; v = (-d * 0.62 + q * 0.78).normalized()  # car heads to frame-left
# car billboard standing on the gold face
img = bpy.data.images.load(car); iw, ih = img.size; CL = (A - B).length * 0.30; CH = CL * ih / iw
bpy.ops.mesh.primitive_plane_add(size=1); cp = bpy.context.active_object; cp.name = 'car'
cp.scale = (CL, CH, 1); bpy.ops.object.transform_apply(scale=True)
cm = bpy.data.materials.new('car'); cm.use_nodes = True; nt = cm.node_tree; nt.nodes.clear(); cm.blend_method = 'BLEND'
ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = img; ti.extension = 'CLIP'
em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.35
tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader'); mo = nt.nodes.new('ShaderNodeOutputMaterial')
fd = nt.nodes.new('ShaderNodeMath'); fd.operation = 'MULTIPLY'; fd.inputs[1].default_value = 1.0
nt.links.new(ti.outputs['Color'], em.inputs['Color']); nt.links.new(ti.outputs['Alpha'], fd.inputs[0]); nt.links.new(fd.outputs[0], mx.inputs[0])
nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], mo.inputs[0])
cp.data.materials.append(cm)
# orient: plane local X = travel axis seen from camera (right), local Y = up (out of face), normal toward camera
right = v.cross(UP).normalized()  # camera right; car front points to -right... image front is on its left
R = Matrix((right, UP, -v)).transposed(); cp.rotation_mode = 'QUATERNION'

def ease(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def outq(x): x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 4
def inq(x): x = max(0.0, min(1.0, x)); return x ** 3
cam = bpy.data.cameras.new('c'); co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co; co.rotation_mode = 'QUATERNION'
cam.dof.use_dof = True
def look(eye, tgt, up):
    f = (tgt - eye).normalized(); r = f.cross(up).normalized(); u = r.cross(f)
    return Matrix((r, u, -f)).transposed().to_quaternion()
FACE_EYE = Vector((0, yf - 8.6, 0.0)); FACE_TGT = Vector((0, 0, 0.0))
NA = int(N * 0.5)  # chase phase
EL = math.radians(26); vh = v
for f in range(1, N + 1):
    u = 1.25 * (f - 1) / NA
    pc = A.lerp(B, u) if u <= 1 else B + (B - A) * (u - 1)
    D = CL * 2.0
    chase_eye = pc - vh * D * math.cos(EL) + UP * D * math.sin(EL) - d * CL * 0.15
    chase_tgt = pc + UP * (CH * 0.35) + d * CL * 0.2
    # car card: bottom edge on the gold face, leaned back to face the camera
    right = vh.cross(UP).normalized(); n = (chase_eye - pc); n = (n - right * n.dot(right)).normalized(); up_b = n.cross(right)
    Rm = Matrix((right, up_b, n)).transposed()
    cp.location = pc + up_b * (CH * 0.5); cp.rotation_quaternion = Rm.to_quaternion(); cp.keyframe_insert('location', frame=f); cp.keyframe_insert('rotation_quaternion', frame=f)
    fd.inputs[1].default_value = 1 - ease((f - NA * 0.95) / (N * 0.12)); fd.inputs[1].keyframe_insert('default_value', frame=f)
    m = ease((f - NA * 0.75) / (N * 0.5)); mm = outq((f - NA * 0.75) / (N * 0.55))
    eye = chase_eye.lerp(FACE_EYE, mm); tgt = chase_tgt.lerp(FACE_TGT, m); up = UP.lerp(Vector((0, 0, 1)), ease((f - NA * 0.75) / (N * 0.35))).normalized()
    co.location = eye; co.rotation_quaternion = look(eye, tgt, up); co.keyframe_insert('location', frame=f); co.keyframe_insert('rotation_quaternion', frame=f)
    cam.lens = 28 + 22 * m; cam.keyframe_insert('lens', frame=f)
    cam.dof.focus_distance = (tgt - eye).length; cam.dof.keyframe_insert('focus_distance', frame=f)
    cam.dof.aperture_fstop = 1.8 + 20 * ease((f - NA) / (N * 0.4)); cam.dof.keyframe_insert('aperture_fstop', frame=f)

def strip(name, loc, rot, size, strength, col=(1, 0.97, 0.92)):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    p = bpy.context.active_object; p.name = name; p.scale = size
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = strength; e.inputs['Color'].default_value = (*col, 1)
    on = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], on.inputs[0]); p.data.materials.append(m)
    p.visible_camera = False; return p
strip('top', (0, -1.0, 3.2), (math.radians(20), 0, 0), (9, 0.35, 1), 14)
strip('left', (-4.2, -1.5, 0.6), (0, math.radians(-70), 0), (0.3, 4, 1), 8, (1, 0.86, 0.66))
strip('right', (4.4, -1.2, 0.2), (0, math.radians(70), 0), (0.25, 4, 1), 6, (0.8, 0.86, 1))
sky = strip('sky', (0, -16, 3.2), (math.radians(90), 0, 0), (26, 6, 1), 4.0, (1, 0.95, 0.86)); sky.light_linking.receiver_collection = gcol
# overhead tunnel lights out in front of the face: reflected streaks racing past in the chase
for i in range(9):
    tl = strip(f'tl{i}', B + UP * 1.2 + d * (i * 0.35 - 1.4) + q * 0.0, (0, 0, 0), (0.6, 0.04, 1), 18); tl.rotation_euler = (math.radians(90), 0, math.atan2(d.z, d.x))
    en = tl.data.materials[0].node_tree.nodes['Emission'].inputs['Strength']
    for f in range(1, N + 1):
        en.default_value = 18 * (1 - ease((f - NA * 0.8) / (N * 0.2)) ); en.keyframe_insert('default_value', frame=f)
sweep = strip('sweep', (0, -2.6, 0), (math.radians(90), 0, math.radians(18)), (0.22, 5, 1), 40)
for f in range(1, N + 1):
    x = -6 + 12 * ease((f - N * 0.72) / (N * 0.26)); sweep.location = (x, -2.6, 0.2); sweep.keyframe_insert('location', frame=f)
L = bpy.data.lights.new('key', 'AREA'); L.energy = 300; L.size = 3
lo = bpy.data.objects.new('key', L); sc.collection.objects.link(lo); lo.location = (-2, -5, 3); lo.rotation_euler = lo.location.to_track_quat('Z', 'Y').to_euler()
wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True; wd.node_tree.nodes['Background'].inputs['Color'].default_value = (0, 0, 0, 1)

sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMP; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6; sc.cycles.glossy_bounces = 4; sc.cycles.transparent_max_bounces = 8
sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = 0.5
sc.render.film_transparent = True; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.render.resolution_x = RX; sc.render.resolution_y = RY; sc.render.fps = 30
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - High Contrast'
sc.frame_start, sc.frame_end = 1, N
if FRAMES:
    for f in [int(x) for x in FRAMES.split(',')]:
        sc.frame_set(f); sc.render.filepath = f'{out}/{f:04d}.png'; bpy.ops.render.render(write_still=True)
else:
    sc.render.filepath = out + '/'; bpy.ops.render.render(animation=True)
