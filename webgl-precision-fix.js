// WebGL Precision Format Fix for Mobile Browsers
(function() {
    'use strict';
    
    // Store original function
    const originalGetShaderPrecisionFormat = WebGLRenderingContext.prototype.getShaderPrecisionFormat;
    
    // Override with null-safe version
    WebGLRenderingContext.prototype.getShaderPrecisionFormat = function(shaderType, precisionType) {
        const result = originalGetShaderPrecisionFormat.call(this, shaderType, precisionType);
        
        // If result is null, return a fallback object
        if (!result) {
            console.warn('getShaderPrecisionFormat returned null, using fallback values');
            return {
                rangeMin: 1,
                rangeMax: 1,
                precision: 23
            };
        }
        
        return result;
    };
    
    // Also handle WebGL2 context if available
    if (typeof WebGL2RenderingContext !== 'undefined') {
        const originalGetShaderPrecisionFormat2 = WebGL2RenderingContext.prototype.getShaderPrecisionFormat;
        
        WebGL2RenderingContext.prototype.getShaderPrecisionFormat = function(shaderType, precisionType) {
            const result = originalGetShaderPrecisionFormat2.call(this, shaderType, precisionType);
            
            if (!result) {
                console.warn('WebGL2 getShaderPrecisionFormat returned null, using fallback values');
                return {
                    rangeMin: 1,
                    rangeMax: 1,
                    precision: 23
                };
            }
            
            return result;
        };
    }
})();

// Additional WebGL compatibility checks
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        
        // Test shader precision format support
        const vertexShaderPrecision = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT);
        const fragmentShaderPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
        
        console.log('WebGL precision support:', {
            vertex: vertexShaderPrecision,
            fragment: fragmentShaderPrecision
        });
        
        return true;
    } catch (error) {
        console.error('WebGL compatibility issue:', error);
        return false;
    }
}

// Run compatibility check
checkWebGLSupport();
