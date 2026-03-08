import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

class Vector2D {
    constructor(public x: number, public y: number) {}
    static random(min: number, max: number): number {
        return min + Math.random() * (max - min)
    }
}

class Vector3D {
    constructor(public x: number, public y: number, public z: number) {}
}

class Star {
    private dx: number
    private dy: number
    private spiralLocation: number
    private strokeWeightFactor: number
    private z: number
    private angle: number
    private distance: number
    private rotationDirection: number
    private expansionRate: number
    private finalScale: number

    constructor(cameraZ: number, cameraTravelDistance: number) {
        this.angle = Math.random() * Math.PI * 2
        this.distance = 30 * Math.random() + 15
        this.rotationDirection = Math.random() > 0.5 ? 1 : -1
        this.expansionRate = 1.2 + Math.random() * 0.8
        this.finalScale = 0.7 + Math.random() * 0.6

        this.dx = this.distance * Math.cos(this.angle)
        this.dy = this.distance * Math.sin(this.angle)

        this.spiralLocation = (1 - Math.pow(1 - Math.random(), 3.0)) / 1.3
        this.z = Vector2D.random(0.5 * cameraZ, cameraTravelDistance + cameraZ)

        const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t
        this.z = lerp(this.z, cameraTravelDistance / 2, 0.3 * this.spiralLocation)
        this.strokeWeightFactor = Math.pow(Math.random(), 2.0)
    }

    render(p: number, ctrl: AnimationController) {
        const spiralPos = ctrl.spiralPath(this.spiralLocation)
        const q = p - this.spiralLocation

        if (q > 0) {
            const dp = ctrl.constrain(4 * q, 0, 1)

            const linearE = dp
            const elasticE = ctrl.easeOutElastic(dp)
            const powerE = Math.pow(dp, 2)

            let easing: number
            if (dp < 0.3) {
                easing = ctrl.lerp(linearE, powerE, dp / 0.3)
            } else if (dp < 0.7) {
                easing = ctrl.lerp(powerE, elasticE, (dp - 0.3) / 0.4)
            } else {
                easing = elasticE
            }

            let screenX: number, screenY: number

            if (dp < 0.3) {
                screenX = ctrl.lerp(spiralPos.x, spiralPos.x + this.dx * 0.3, easing / 0.3)
                screenY = ctrl.lerp(spiralPos.y, spiralPos.y + this.dy * 0.3, easing / 0.3)
            } else if (dp < 0.7) {
                const mid = (dp - 0.3) / 0.4
                const curve = Math.sin(mid * Math.PI) * this.rotationDirection * 1.5
                const bx = spiralPos.x + this.dx * 0.3
                const by = spiralPos.y + this.dy * 0.3
                const tx = spiralPos.x + this.dx * 0.7
                const ty = spiralPos.y + this.dy * 0.7
                const px = -this.dy * 0.4 * curve
                const py = this.dx * 0.4 * curve
                screenX = ctrl.lerp(bx, tx, mid) + px * mid
                screenY = ctrl.lerp(by, ty, mid) + py * mid
            } else {
                const fp = (dp - 0.7) / 0.3
                const bx = spiralPos.x + this.dx * 0.7
                const by = spiralPos.y + this.dy * 0.7
                const td = this.distance * this.expansionRate * 1.5
                const sa = this.angle + 1.2 * this.rotationDirection * fp * Math.PI
                const tx = spiralPos.x + td * Math.cos(sa)
                const ty = spiralPos.y + td * Math.sin(sa)
                screenX = ctrl.lerp(bx, tx, fp)
                screenY = ctrl.lerp(by, ty, fp)
            }

            const vx = (this.z - ctrl.cameraZ) * screenX / ctrl.viewZoom
            const vy = (this.z - ctrl.cameraZ) * screenY / ctrl.viewZoom

            let sizeMul = 1.0
            if (dp < 0.6) {
                sizeMul = 1.0 + dp * 0.2
            } else {
                const t = (dp - 0.6) / 0.4
                sizeMul = 1.2 * (1.0 - t) + this.finalScale * t
            }

            ctrl.showProjectedDot(new Vector3D(vx, vy, this.z), 8.5 * this.strokeWeightFactor * sizeMul)
        }
    }
}

class AnimationController {
    private timeline: gsap.core.Timeline
    private time = 0
    private ctx: CanvasRenderingContext2D
    private size: number
    private stars: Star[] = []

    private readonly changeEventTime = 0.32
    public readonly cameraZ = -400
    private readonly cameraTravelDistance = 3400
    private readonly startDotYOffset = 28
    public readonly viewZoom = 100
    private readonly numberOfStars = 5000
    private readonly trailLength = 80

    constructor(ctx: CanvasRenderingContext2D, size: number) {
        this.ctx = ctx
        this.size = size
        this.timeline = gsap.timeline()

        const origRandom = Math.random
        const seeded = (() => {
            let seed = 1234
            return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
        })()
        Math.random = seeded
        for (let i = 0; i < this.numberOfStars; i++) {
            this.stars.push(new Star(this.cameraZ, this.cameraTravelDistance))
        }
        Math.random = origRandom

        this.timeline.to(this, {
            time: 1, duration: 15, repeat: -1, ease: 'none',
            onUpdate: () => this.render()
        })
    }

    ease(p: number, g: number): number {
        return p < 0.5
            ? 0.5 * Math.pow(2 * p, g)
            : 1 - 0.5 * Math.pow(2 * (1 - p), g)
    }

    easeOutElastic(x: number): number {
        const c4 = (2 * Math.PI) / 4.5
        if (x <= 0) return 0
        if (x >= 1) return 1
        return Math.pow(2, -8 * x) * Math.sin((x * 8 - 0.75) * c4) + 1
    }

    map(v: number, s1: number, e1: number, s2: number, e2: number): number {
        return s2 + (e2 - s2) * ((v - s1) / (e1 - s1))
    }

    constrain(v: number, min: number, max: number): number {
        return Math.min(Math.max(v, min), max)
    }

    lerp(a: number, b: number, t: number): number {
        return a * (1 - t) + b * t
    }

    spiralPath(p: number): Vector2D {
        p = this.constrain(1.2 * p, 0, 1)
        p = this.ease(p, 1.8)
        const theta = 2 * Math.PI * 6 * Math.sqrt(p)
        const r = 170 * Math.sqrt(p)
        return new Vector2D(r * Math.cos(theta), r * Math.sin(theta) + this.startDotYOffset)
    }

    showProjectedDot(pos: Vector3D, sizeFactor: number) {
        const t2 = this.constrain(this.map(this.time, this.changeEventTime, 1, 0, 1), 0, 1)
        const newCamZ = this.cameraZ + this.ease(Math.pow(t2, 1.2), 1.8) * this.cameraTravelDistance

        if (pos.z > newCamZ) {
            const depth = pos.z - newCamZ
            const x = this.viewZoom * pos.x / depth
            const y = this.viewZoom * pos.y / depth
            const sw = 400 * sizeFactor / depth
            this.ctx.lineWidth = sw
            this.ctx.beginPath()
            this.ctx.arc(x, y, 0.5, 0, Math.PI * 2)
            this.ctx.fill()
        }
    }

    private render() {
        const ctx = this.ctx
        if (!ctx) return

        ctx.clearRect(0, 0, this.size, this.size)

        ctx.save()
        ctx.translate(this.size / 2, this.size / 2)

        const t1 = this.constrain(this.map(this.time, 0, this.changeEventTime + 0.25, 0, 1), 0, 1)
        const t2 = this.constrain(this.map(this.time, this.changeEventTime, 1, 0, 1), 0, 1)

        ctx.rotate(-Math.PI * this.ease(t2, 2.7))

        for (let i = 0; i < this.trailLength; i++) {
            const f = this.map(i, 0, this.trailLength, 1.1, 0.1)
            const sw = (1.3 * (1 - t1) + 3.0 * Math.sin(Math.PI * t1)) * f
            ctx.fillStyle = 'white'
            ctx.lineWidth = sw
            const pathTime = t1 - 0.00015 * i
            const position = this.spiralPath(pathTime)
            const offset = new Vector2D(position.x + 5, position.y + 5)
            const mid = new Vector2D((position.x + offset.x) / 2, (position.y + offset.y) / 2)
            const dx = position.x - mid.x
            const dy = position.y - mid.y
            const angle = Math.atan2(dy, dx)
            const o = i % 2 === 0 ? -1 : 1
            const r = Math.sqrt(dx * dx + dy * dy)
            const rp = Math.sin(this.time * Math.PI * 2) * 0.5 + 0.5
            const bounce = Math.sin(rp * Math.PI) * 0.05 * (1 - rp)
            const rx = mid.x + r * (1 + bounce) * Math.cos(angle + o * Math.PI * this.easeOutElastic(rp))
            const ry = mid.y + r * (1 + bounce) * Math.sin(angle + o * Math.PI * this.easeOutElastic(rp))
            ctx.beginPath()
            ctx.arc(rx, ry, sw / 2, 0, Math.PI * 2)
            ctx.fill()
        }

        ctx.fillStyle = 'white'
        for (const star of this.stars) {
            star.render(t1, this)
        }

        if (this.time > this.changeEventTime) {
            const dy = this.cameraZ * this.startDotYOffset / this.viewZoom
            this.showProjectedDot(new Vector3D(0, dy, this.cameraTravelDistance), 2.5)
        }

        ctx.restore()
    }

    destroy() {
        this.timeline.kill()
    }
}

type SpiralAnimationProps = {
    size?: number
    className?: string
}

export default function SpiralAnimation({ size = 160, className = '' }: SpiralAnimationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const ctrlRef = useRef<AnimationController | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        const canvasSize = size * dpr

        canvas.width = canvasSize
        canvas.height = canvasSize
        canvas.style.width = `${size}px`
        canvas.style.height = `${size}px`
        ctx.scale(dpr, dpr)

        ctrlRef.current = new AnimationController(ctx, size)

        return () => {
            if (ctrlRef.current) {
                ctrlRef.current.destroy()
                ctrlRef.current = null
            }
        }
    }, [size])

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{ width: size, height: size }}
        />
    )
}
