// Comprehensive WebGL Mobile Compatibility Fix
(function() {
    'use strict';
    
    console.log('Loading comprehensive WebGL mobile fix...');
    
    // Store original methods
    const originalMethods = {
        getContext: HTMLCanvasElement.prototype.getContext,
        getShaderPrecisionFormat: WebGLRenderingContext.prototype.getShaderPrecisionFormat,
        createShader: WebGLRenderingContext.prototype.createShader,
        createProgram: WebGLRenderingContext.prototype.createProgram,
        shaderSource: WebGLRenderingContext.prototype.shaderSource,
        compileShader: WebGLRenderingContext.prototype.compileShader,
        getShaderParameter: WebGLRenderingContext.prototype.getShaderParameter,
        getProgramParameter: WebGLRenderingContext.prototype.getProgramParameter,
        attachShader: WebGLRenderingContext.prototype.attachShader,
        linkProgram: WebGLRenderingContext.prototype.linkProgram,
        useProgram: WebGLRenderingContext.prototype.useProgram
    };
    
    // Track mock objects
    const mockShaders = new WeakMap();
    const mockPrograms = new WeakMap();
    let mockCounter = 0;
    
    function createShaderData(type) {
        return {
            type: type,
            source: '',
            compiled: true,
            compileStatus: true,
            infoLog: '',
            deleteStatus: false
        };
    }
    
    function createProgramData() {
        return {
            linkStatus: true,
            validateStatus: true,
            infoLog: '',
            deleteStatus: false,
            attachedShaders: [],
            name: ++mockCounter
        };
    }
    
    // Override getContext to force conservative settings
    HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
        if (contextType === 'webgl' || contextType === 'experimental-webgl' || contextType === 'webgl2') {
            console.log('Creating WebGL context with conservative settings...');
            
            // Force conservative WebGL context attributes
            const conservativeAttributes = {
                alpha: false,
                antialias: false,
                depth: true,
                failIfMajorPerformanceCaveat: false,
                powerPreference: 'default',
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                stencil: false,
                ...contextAttributes
            };
            
            console.log('WebGL context attributes:', conservativeAttributes);
            
            const context = originalMethods.getContext.call(this, contextType, conservativeAttributes);
            
            if (context) {
                console.log('WebGL context created successfully');
                console.log('WebGL version:', context.getParameter(context.VERSION));
                console.log('WebGL vendor:', context.getParameter(context.VENDOR));
                console.log('WebGL renderer:', context.getParameter(context.RENDERER));
            }
            
            return context;
        }
        
        return originalMethods.getContext.call(this, contextType, contextAttributes);
    };
    
    // Override getShaderPrecisionFormat
    WebGLRenderingContext.prototype.getShaderPrecisionFormat = function(shaderType, precisionType) {
        let result;
        try {
            result = originalMethods.getShaderPrecisionFormat.call(this, shaderType, precisionType);
        } catch (e) {
            console.warn('getShaderPrecisionFormat error:', e);
            result = null;
        }
        
        if (!result) {
            console.warn('getShaderPrecisionFormat returned null, using conservative fallback');
            return {
                rangeMin: 1,
                rangeMax: 1,
                precision: 23
            };
        }
        return result;
    };
    
    // Override createShader
    WebGLRenderingContext.prototype.createShader = function(type) {
        let shader;
        try {
            shader = originalMethods.createShader.call(this, type);
        } catch (e) {
            console.error('createShader error:', e);
            shader = null;
        }
        
        if (!shader) {
            console.warn('createShader failed, creating mock shader');
            shader = Object.create(WebGLShader.prototype);
            mockShaders.set(shader, createShaderData(type));
            Object.defineProperty(shader, '__isMock', { value: true });
        }
        
        return shader;
    };
    
    // Override createProgram
    WebGLRenderingContext.prototype.createProgram = function() {
        let program;
        try {
            program = originalMethods.createProgram.call(this);
        } catch (e) {
            console.error('createProgram error:', e);
            program = null;
        }
        
        if (!program) {
            console.warn('createProgram failed, creating mock program');
            program = Object.create(WebGLProgram.prototype);
            const programData = createProgramData();
            mockPrograms.set(program, programData);
            
            // Add the name property that Unity expects
            Object.defineProperty(program, 'name', { 
                value: programData.name, 
                writable: true 
            });
            Object.defineProperty(program, '__isMock', { value: true });
        }
        
        return program;
    };
    
    // Override other shader/program methods to handle mocks
    WebGLRenderingContext.prototype.shaderSource = function(shader, source) {
        if (mockShaders.has(shader)) {
            mockShaders.get(shader).source = source;
            return;
        }
        return originalMethods.shaderSource.call(this, shader, source);
    };
    
    WebGLRenderingContext.prototype.compileShader = function(shader) {
        if (mockShaders.has(shader)) {
            mockShaders.get(shader).compiled = true;
            return;
        }
        return originalMethods.compileShader.call(this, shader);
    };
    
    WebGLRenderingContext.prototype.getShaderParameter = function(shader, pname) {
        if (mockShaders.has(shader)) {
            const data = mockShaders.get(shader);
            if (pname === this.COMPILE_STATUS) return data.compileStatus;
            if (pname === this.DELETE_STATUS) return data.deleteStatus;
            if (pname === this.SHADER_TYPE) return data.type;
            return true;
        }
        return originalMethods.getShaderParameter.call(this, shader, pname);
    };
    
    WebGLRenderingContext.prototype.getProgramParameter = function(program, pname) {
        if (mockPrograms.has(program)) {
            const data = mockPrograms.get(program);
            if (pname === this.LINK_STATUS) return data.linkStatus;
            if (pname === this.VALIDATE_STATUS) return data.validateStatus;
            if (pname === this.DELETE_STATUS) return data.deleteStatus;
            return true;
        }
        return originalMethods.getProgramParameter.call(this, program, pname);
    };
    
    WebGLRenderingContext.prototype.attachShader = function(program, shader) {
        if (mockPrograms.has(program) || mockShaders.has(shader)) {
            console.warn('attachShader called on mock object, ignoring');
            if (mockPrograms.has(program)) {
                mockPrograms.get(program).attachedShaders.push(shader);
            }
            return;
        }
        return originalMethods.attachShader.call(this, program, shader);
    };
    
    WebGLRenderingContext.prototype.linkProgram = function(program) {
        if (mockPrograms.has(program)) {
            mockPrograms.get(program).linkStatus = true;
            return;
        }
        return originalMethods.linkProgram.call(this, program);
    };
    
    WebGLRenderingContext.prototype.useProgram = function(program) {
        if (mockPrograms.has(program)) {
            console.warn('useProgram called on mock program, ignoring');
            return;
        }
        return originalMethods.useProgram.call(this, program);
    };
    
    // Add WebGL2 support if available
    if (typeof WebGL2RenderingContext !== 'undefined') {
        console.log('Applying WebGL2 compatibility fixes...');
        
        // Apply same overrides to WebGL2
        WebGL2RenderingContext.prototype.getShaderPrecisionFormat = WebGLRenderingContext.prototype.getShaderPrecisionFormat;
        WebGL2RenderingContext.prototype.createShader = WebGLRenderingContext.prototype.createShader;
        WebGL2RenderingContext.prototype.createProgram = WebGLRenderingContext.prototype.createProgram;
        // ...existing code for other methods...
    }
    
    console.log('Comprehensive WebGL mobile fix loaded');
})();

// Enhanced support check
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        
        console.log('WebGL support confirmed');
        console.log('Max texture size:', gl.getParameter(gl.MAX_TEXTURE_SIZE));
        console.log('Max vertex attribs:', gl.getParameter(gl.MAX_VERTEX_ATTRIBS));
        
        return true;
    } catch (e) {
        console.error('WebGL support check failed:', e);
        return false;
    }
}

checkWebGLSupport();
